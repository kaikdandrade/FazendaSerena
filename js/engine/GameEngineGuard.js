"use strict";

(() => {
  const Engine = window.GameEngine;
  if (typeof Engine !== "function" || !Engine.prototype) return;

  const hardenFunctionDescriptor = (target, key) => {
    const descriptor = Object.getOwnPropertyDescriptor(target, key);
    if (!descriptor) return;

    if (typeof descriptor.value === "function") {
      Object.defineProperty(target, key, {
        ...descriptor,
        writable: false,
        configurable: false
      });
      return;
    }

    if (descriptor.get || descriptor.set) {
      Object.defineProperty(target, key, {
        ...descriptor,
        configurable: false
      });
    }
  };

  // Todos os módulos da engine já foram carregados quando este arquivo executa.
  // A partir daqui, nenhum método de instância pode ser substituído no prototype.
  for (const key of Reflect.ownKeys(Engine.prototype)) {
    if (key === "constructor") continue;
    hardenFunctionDescriptor(Engine.prototype, key);
  }
  Object.freeze(Engine.prototype);

  // Mantém os parâmetros administrativos estáticos mutáveis, mas trava métodos
  // estáticos para que também não possam ser trocados pelo console.
  for (const key of Reflect.ownKeys(Engine)) {
    if (key === "prototype") continue;
    hardenFunctionDescriptor(Engine, key);
  }

  const security = {
    hardenInstance(instance) {
      if (!(instance instanceof Engine)) return instance;
      // Impede criar uma propriedade própria com o mesmo nome de um método
      // protegido (ex.: engine.getSalePrice = ...), sem congelar state/data.
      Object.preventExtensions(instance);
      return instance;
    },
    isPrototypeLocked() {
      return Object.isFrozen(Engine.prototype);
    }
  };

  Object.freeze(security);
  Object.defineProperty(window, "FazendaSerenaEngineSecurity", {
    value: security,
    writable: false,
    configurable: false,
    enumerable: false
  });
})();
