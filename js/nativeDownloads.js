"use strict";
(() => {
  const windowsButton=document.querySelector('[data-native-download="windows"]');
  const androidButton=document.querySelector('[data-native-download="android"]');
  const androidDetail=document.querySelector('[data-native-detail="android"]');

  async function chooseWindowsFile(){
    if(!windowsButton || !/Windows/i.test(navigator.userAgent||"")) return;
    try{
      const data=navigator.userAgentData;
      if(!data?.getHighEntropyValues) return;
      const values=await data.getHighEntropyValues(["architecture"]);
      if(/arm/i.test(values.architecture||"")) windowsButton.href="downloads/FazendaSerena-Setup-arm64.exe";
    }catch(_){}
  }

  async function updateAndroidDownload(){
    if(!androidButton) return;
    const apk=androidButton.dataset.nativeUrl||"downloads/FazendaSerena-Android.apk";
    try{
      const response=await fetch(apk,{method:"HEAD",cache:"no-store"});
      if(!response.ok) throw new Error(String(response.status));
      androidButton.classList.remove("is-unavailable");
      androidButton.href=apk;
      androidButton.removeAttribute("aria-disabled");
      androidButton.textContent="Baixar para Android";
      if(androidDetail) androidDetail.hidden=true;
    }catch(_){
      androidButton.classList.add("is-unavailable");
      androidButton.removeAttribute("href");
      androidButton.setAttribute("aria-disabled","true");
      androidButton.textContent="Aplicativo Android em breve";
      if(androidDetail) androidDetail.hidden=false;
    }
  }

  chooseWindowsFile();
  updateAndroidDownload();
})();
