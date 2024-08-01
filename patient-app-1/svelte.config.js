const sveltePreprocess = require('svelte-preprocess');

module.exports = {
  preprocess: sveltePreprocess(),
  kit: {
    target: '#svelte'
  }
};
