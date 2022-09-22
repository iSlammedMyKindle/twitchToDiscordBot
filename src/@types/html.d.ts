// Declaring a module with *.html due to us
// not having a default import w/ html
// if we define properties / export a default it'll
// compile to `require('thing.html').default` lol
declare module '*.html';