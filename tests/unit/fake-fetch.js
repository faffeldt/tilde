// Serves every file as its own name, so sizes are predictable; `overrides` change single files.
export function fakeFetch(overrides = {}) {
  return (url) => {
    const override = overrides[url];
    if (override === 'fail') return Promise.reject(new TypeError('Failed to fetch'));
    const { body = url, status = 200, modified } = override ?? {};
    const headers = modified ? { 'Last-Modified': new Date(modified).toUTCString() } : {};
    return Promise.resolve(new Response(body, { status, headers }));
  };
}
