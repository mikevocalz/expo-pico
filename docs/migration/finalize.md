# Nitro removal and finalization

After all stacked migrations land:
- remove react-native-nitro-modules and nitrogen
- delete *.nitro.ts, nitro.json, generated Nitrogen build glue, Nitro stubs
- refresh lockfile
- npm pack audit
- APK native library / 16 KB alignment audit
- package-size and native-heap benchmark docs
- ensure example/template contains no Nitro dependency
