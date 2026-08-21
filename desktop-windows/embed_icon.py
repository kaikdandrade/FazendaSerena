from pathlib import Path
import struct, sys

def align(n,a): return (n + a - 1) // a * a

def parse_ico(path):
    b=Path(path).read_bytes()
    reserved,typ,count=struct.unpack_from('<HHH',b,0)
    if reserved!=0 or typ!=1 or count<1: raise ValueError('ICO inválido')
    entries=[]
    for i in range(count):
        off=6+i*16
        width,height,color,res,planes,bpp,size,img_off=struct.unpack_from('<BBBBHHII',b,off)
        data=b[img_off:img_off+size]
        if len(data)!=size: raise ValueError('ICO truncado')
        entries.append((width,height,color,res,planes,bpp,size,data))
    return entries

def build_rsrc(entries, section_rva, lang=0x0409):
    n=len(entries)
    # layout directories
    root_off=0
    root_size=16+2*8
    icon_type_off=root_off+root_size
    icon_type_size=16+n*8
    icon_id_offs=[]
    cur=icon_type_off+icon_type_size
    for _ in range(n):
        icon_id_offs.append(cur); cur += 16+8
    group_type_off=cur; cur += 16+8
    group_id_off=cur; cur += 16+8
    cur=align(cur,4)
    data_entries_off=cur
    cur += (n+1)*16
    cur=align(cur,4)
    payload_offs=[]
    for e in entries:
        payload_offs.append(cur); cur += len(e[7]); cur=align(cur,4)
    group_payload_off=cur
    # GRPICONDIR
    group=bytearray(struct.pack('<HHH',0,1,n))
    for idx,e in enumerate(entries, start=1):
        width,height,color,res,planes,bpp,size,_=e
        group += struct.pack('<BBBBHHIH',width,height,color,res,planes,bpp,size,idx)
    cur += len(group); cur=align(cur,4)
    out=bytearray(cur)

    def dir_header(off, id_count):
        struct.pack_into('<IIHHHH',out,off,0,0,0,0,0,id_count)
    # root
    dir_header(root_off,2)
    struct.pack_into('<II',out,root_off+16,3,0x80000000|icon_type_off)
    struct.pack_into('<II',out,root_off+24,14,0x80000000|group_type_off)
    # icon type
    dir_header(icon_type_off,n)
    p=icon_type_off+16
    for idx,idoff in enumerate(icon_id_offs, start=1):
        struct.pack_into('<II',out,p,idx,0x80000000|idoff); p+=8
    # icon id/lang dirs
    for idx,idoff in enumerate(icon_id_offs):
        dir_header(idoff,1)
        struct.pack_into('<II',out,idoff+16,lang,data_entries_off+idx*16)
    # group dirs
    dir_header(group_type_off,1)
    struct.pack_into('<II',out,group_type_off+16,1,0x80000000|group_id_off)
    dir_header(group_id_off,1)
    struct.pack_into('<II',out,group_id_off+16,lang,data_entries_off+n*16)
    # data entries/payloads
    for idx,e in enumerate(entries):
        data=e[7]; po=payload_offs[idx]
        struct.pack_into('<IIII',out,data_entries_off+idx*16,section_rva+po,len(data),0,0)
        out[po:po+len(data)]=data
    struct.pack_into('<IIII',out,data_entries_off+n*16,section_rva+group_payload_off,len(group),0,0)
    out[group_payload_off:group_payload_off+len(group)] = group
    return bytes(out)

def inject(exe_path, ico_path, output_path=None):
    p=Path(exe_path); b=bytearray(p.read_bytes())
    peoff=struct.unpack_from('<I',b,0x3c)[0]
    if b[peoff:peoff+4]!=b'PE\0\0': raise ValueError('PE inválido')
    fh=peoff+4
    machine,nsec,tstamp,ptrsym,nsym,opt_size,chars=struct.unpack_from('<HHIIIHH',b,fh)
    opt=fh+20; magic=struct.unpack_from('<H',b,opt)[0]
    if magic==0x20b:
        data_dir=opt+112
    elif magic==0x10b:
        data_dir=opt+96
    else: raise ValueError('Optional Header desconhecido')
    sec_align=struct.unpack_from('<I',b,opt+32)[0]
    file_align=struct.unpack_from('<I',b,opt+36)[0]
    size_headers=struct.unpack_from('<I',b,opt+60)[0]
    sec_table=opt+opt_size
    next_hdr=sec_table+nsec*40
    if next_hdr+40 > size_headers: raise ValueError('Sem espaço no cabeçalho para nova seção')
    max_end_rva=0
    for i in range(nsec):
        off=sec_table+i*40
        vs,va,raw_size,raw_ptr=struct.unpack_from('<IIII',b,off+8)
        max_end_rva=max(max_end_rva, va + align(max(vs,raw_size),sec_align))
    new_rva=align(max_end_rva,sec_align)
    entries=parse_ico(ico_path)
    rsrc=build_rsrc(entries,new_rva)
    raw_ptr=align(len(b),file_align)
    raw_size=align(len(rsrc),file_align)
    if len(b)<raw_ptr: b.extend(b'\0'*(raw_ptr-len(b)))
    b.extend(rsrc)
    if len(rsrc)<raw_size: b.extend(b'\0'*(raw_size-len(rsrc)))
    # section header
    sh=sec_table+nsec*40
    name=b'.rsrc\0\0\0'
    b[sh:sh+8]=name
    struct.pack_into('<IIIIIIHHI',b,sh+8,len(rsrc),new_rva,raw_size,raw_ptr,0,0,0,0,0x40000040)
    struct.pack_into('<H',b,fh+2,nsec+1)
    # SizeOfInitializedData + SizeOfImage
    old_init=struct.unpack_from('<I',b,opt+8)[0]
    struct.pack_into('<I',b,opt+8,old_init+raw_size)
    struct.pack_into('<I',b,opt+56,align(new_rva+len(rsrc),sec_align))
    # Resource data directory
    struct.pack_into('<II',b,data_dir+2*8,new_rva,len(rsrc))
    # Checksum -> zero; Windows accepts zero and it avoids a stale value
    struct.pack_into('<I',b,opt+64,0)
    out=Path(output_path) if output_path else p
    out.write_bytes(b)
    return {'machine':hex(machine),'sections':nsec+1,'resource_rva':hex(new_rva),'resource_size':len(rsrc),'raw_size':raw_size,'icons':len(entries)}

if __name__=='__main__':
    if len(sys.argv)<3:
        print('uso: inject_icon.py EXE ICO [OUTPUT]'); raise SystemExit(2)
    print(inject(sys.argv[1],sys.argv[2],sys.argv[3] if len(sys.argv)>3 else None))
