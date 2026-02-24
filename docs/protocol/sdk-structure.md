# SDK Folder Structure

```text
sdk/
  vindicate-js/
    package.json
    README.md
    src/
      index.js
      client.js
      verification.js
      did.js
      zk.js
      interoperability.js
```

## Module responsibilities

- `client.js`: authenticated HTTP client and request handling.
- `verification.js`: credential and VC verification helpers.
- `did.js`: DID register/resolve/ownership helpers.
- `zk.js`: ZK challenge/proof helpers.
- `interoperability.js`: chain descriptor normalization and anchor query helpers.