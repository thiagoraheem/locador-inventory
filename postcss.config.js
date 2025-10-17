export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
    cssnano: {
      preset: ['default', {
        cssDeclarationSorter: false,
        normalizeWhitespace: false,
        discardComments: { removeAll: true },
        minifySelectors: false,
        normalizeString: false,
        normalizeUnicode: false,
        mergeRules: false,
        convertValues: false,
        normalizeUrl: false,
        minifyParams: false,
        normalizeCharset: false,
        discardDuplicates: false,
        reduceIdents: false,
        zindex: false,
        discardUnused: false,
        mergeIdents: false,
        reduceInitial: false,
        svgo: false,
        calc: false,
        colormin: false,
        orderedValues: false,
        minifyFontValues: false,
        normalizeRepeatStyle: false,
        normalizePositions: false,
        normalizeTimingFunctions: false,
        uniqueSelectors: false,
        normalizeDisplayValues: false
      }]
    }
  },
}
