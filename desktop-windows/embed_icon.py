from pathlib import Path
import struct, sys

PRODUCT_VERSION=(1,0,1,36)
COMPANY_NAME="Kaik D'Andrade"
PRODUCT_NAME="Fazenda Serena"
COPYRIGHT="© 2026 Kaik D'Andrade"

def align(n,a): return (n+a-1)//a*a

def parse_ico(path):
    b=Path(path).read_bytes(); reserved,typ,count=struct.unpack_from('<HHH',b,0)
    if reserved!=0 or typ!=1 or count<1: raise ValueError('ICO inválido')
    out=[]
    for i in range(count):
        o=6+i*16; width,height,color,res,planes,bpp,size,img_off=struct.unpack_from('<BBBBHHII',b,o)
        data=b[img_off:img_off+size]
        if len(data)!=size: raise ValueError('ICO truncado')
        out.append((width,height,color,res,planes,bpp,size,data))
    return out

def utf16z(text): return (str(text)+'\0').encode('utf-16le')
def block(key,value=b'',value_length=0,value_type=0,children=()):
    out=bytearray(struct.pack('<HHH',0,value_length,value_type)); out+=utf16z(key)
    while len(out)%4: out+=b'\0'
    if value:
        out+=value
        while len(out)%4: out+=b'\0'
    for child in children:
        out+=child
        while len(out)%4: out+=b'\0'
    struct.pack_into('<H',out,0,len(out)); return bytes(out)
def vstr(key,value):
    enc=utf16z(value); return block(key,enc,len(enc)//2,1)
def version_info(exe_name):
    major,minor,patch,build=PRODUCT_VERSION
    setup='setup' in exe_name.lower()
    fixed=struct.pack('<13I',0xFEEF04BD,0x00010000,(major<<16)|minor,(patch<<16)|build,(major<<16)|minor,(patch<<16),0x3F,0,0x00040004,1,0,0,0)
    strings=[
        vstr('CompanyName',COMPANY_NAME),
        vstr('FileDescription','Instalador Fazenda Serena' if setup else 'Fazenda Serena'),
        vstr('FileVersion',f'{major}.{minor}.{patch}.{build}'),
        vstr('InternalName','FazendaSerenaSetup' if setup else 'FazendaSerena'),
        vstr('LegalCopyright',COPYRIGHT),
        vstr('OriginalFilename',exe_name),
        vstr('ProductName',PRODUCT_NAME),
        vstr('ProductVersion',f'{major}.{minor}.{patch}')]
    table=block('040904B0',children=strings,value_type=1)
    sfi=block('StringFileInfo',children=[table],value_type=1)
    trans=block('Translation',struct.pack('<HH',0x0409,0x04B0),4,0)
    vfi=block('VarFileInfo',children=[trans],value_type=1)
    return block('VS_VERSION_INFO',fixed,len(fixed),0,[sfi,vfi])

def build_rsrc(entries,section_rva,exe_name,lang=0x0409):
    n=len(entries); root_off=0; root_size=16+3*8
    icon_type_off=root_size; cur=icon_type_off+16+n*8
    icon_id_offs=[]
    for _ in range(n): icon_id_offs.append(cur); cur+=24
    group_type_off=cur; cur+=24; group_id_off=cur; cur+=24
    version_type_off=cur; cur+=24; version_id_off=cur; cur+=24
    cur=align(cur,4); data_entries_off=cur; cur+=(n+2)*16; cur=align(cur,4)
    icon_payload_offs=[]
    for e in entries: icon_payload_offs.append(cur); cur+=len(e[7]); cur=align(cur,4)
    group_payload_off=cur; group=bytearray(struct.pack('<HHH',0,1,n))
    for idx,e in enumerate(entries,1):
        width,height,color,res,planes,bpp,size,_=e; group+=struct.pack('<BBBBHHIH',width,height,color,res,planes,bpp,size,idx)
    cur+=len(group); cur=align(cur,4)
    ver_payload_off=cur; ver=version_info(exe_name); cur+=len(ver); cur=align(cur,4)
    out=bytearray(cur)
    def dh(off,count): struct.pack_into('<IIHHHH',out,off,0,0,0,0,0,count)
    dh(0,3); struct.pack_into('<II',out,16,3,0x80000000|icon_type_off); struct.pack_into('<II',out,24,14,0x80000000|group_type_off); struct.pack_into('<II',out,32,16,0x80000000|version_type_off)
    dh(icon_type_off,n); p=icon_type_off+16
    for idx,idoff in enumerate(icon_id_offs,1): struct.pack_into('<II',out,p,idx,0x80000000|idoff); p+=8
    for idx,idoff in enumerate(icon_id_offs): dh(idoff,1); struct.pack_into('<II',out,idoff+16,lang,data_entries_off+idx*16)
    dh(group_type_off,1); struct.pack_into('<II',out,group_type_off+16,1,0x80000000|group_id_off); dh(group_id_off,1); struct.pack_into('<II',out,group_id_off+16,lang,data_entries_off+n*16)
    dh(version_type_off,1); struct.pack_into('<II',out,version_type_off+16,1,0x80000000|version_id_off); dh(version_id_off,1); struct.pack_into('<II',out,version_id_off+16,lang,data_entries_off+(n+1)*16)
    for idx,e in enumerate(entries):
        data=e[7]; po=icon_payload_offs[idx]; struct.pack_into('<IIII',out,data_entries_off+idx*16,section_rva+po,len(data),0,0); out[po:po+len(data)]=data
    struct.pack_into('<IIII',out,data_entries_off+n*16,section_rva+group_payload_off,len(group),0,0); out[group_payload_off:group_payload_off+len(group)]=group
    struct.pack_into('<IIII',out,data_entries_off+(n+1)*16,section_rva+ver_payload_off,len(ver),1200,0); out[ver_payload_off:ver_payload_off+len(ver)]=ver
    return bytes(out)

def inject(exe_path,ico_path,output_path=None):
    p=Path(exe_path); b=bytearray(p.read_bytes()); peoff=struct.unpack_from('<I',b,0x3c)[0]
    if b[peoff:peoff+4]!=b'PE\0\0': raise ValueError('PE inválido')
    fh=peoff+4; machine,nsec,_,_,_,opt_size,_=struct.unpack_from('<HHIIIHH',b,fh); opt=fh+20; magic=struct.unpack_from('<H',b,opt)[0]
    data_dir=opt+(112 if magic==0x20b else 96 if magic==0x10b else (_ for _ in ()).throw(ValueError('Optional Header desconhecido')))
    old_rva,old_size=struct.unpack_from('<II',b,data_dir+16)
    if old_rva or old_size: raise ValueError('O executável já possui recursos; recompile antes de incorporar.')
    sec_align=struct.unpack_from('<I',b,opt+32)[0]; file_align=struct.unpack_from('<I',b,opt+36)[0]; size_headers=struct.unpack_from('<I',b,opt+60)[0]; sec_table=opt+opt_size
    if sec_table+nsec*40+40>size_headers: raise ValueError('Sem espaço no cabeçalho')
    max_end=0
    for i in range(nsec):
        off=sec_table+i*40; vs,va,raw_size,_=struct.unpack_from('<IIII',b,off+8); max_end=max(max_end,va+align(max(vs,raw_size),sec_align))
    new_rva=align(max_end,sec_align); entries=parse_ico(ico_path); rsrc=build_rsrc(entries,new_rva,p.name); raw_ptr=align(len(b),file_align); raw_size=align(len(rsrc),file_align)
    if len(b)<raw_ptr: b.extend(b'\0'*(raw_ptr-len(b)))
    b.extend(rsrc); b.extend(b'\0'*(raw_size-len(rsrc)))
    sh=sec_table+nsec*40; b[sh:sh+8]=b'.rsrc\0\0\0'; struct.pack_into('<IIIIIIHHI',b,sh+8,len(rsrc),new_rva,raw_size,raw_ptr,0,0,0,0,0x40000040); struct.pack_into('<H',b,fh+2,nsec+1)
    struct.pack_into('<I',b,opt+8,struct.unpack_from('<I',b,opt+8)[0]+raw_size); struct.pack_into('<I',b,opt+56,align(new_rva+len(rsrc),sec_align)); struct.pack_into('<II',b,data_dir+16,new_rva,len(rsrc)); struct.pack_into('<I',b,opt+64,0)
    out=Path(output_path) if output_path else p; out.write_bytes(b); return {'machine':hex(machine),'icons':len(entries),'version_info':True,'company':COMPANY_NAME}
if __name__=='__main__':
    if len(sys.argv)<3: print('uso: embed_icon.py EXE ICO [OUTPUT]'); raise SystemExit(2)
    print(inject(sys.argv[1],sys.argv[2],sys.argv[3] if len(sys.argv)>3 else None))
