const proxyHandler = {
  get: (o, key) => o.get(key)
};

export default (function() {
  const params = new Map();

  window.addEventListener('hashchange', updateParams);
  updateParams();

  function updateParams(e) {
    params.clear();
    const arry = window.location.hash.substr(1).split(';').forEach(param => {
      const [key, val] = param.split('=').map(s => s.trim());
      params.set(key, val);
    });
  }

  return new Proxy(params, proxyHandler);
})();