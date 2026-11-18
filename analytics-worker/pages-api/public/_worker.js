export default {
  fetch(request, env) {
    if (new URL(request.url).pathname.startsWith('/api/')) {
      return env.COURSE_API.fetch(request);
    }
    return env.ASSETS.fetch(request);
  }
};
