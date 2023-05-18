# co2.storage
by [Momcilo Dzunic aka smartbee.eth](https://twitter.com/mdzunic)

Simple previewer for attestation documents and base data schema (DAG) objects related to Renewable Energy Certificates (RECs) -> [0004-FGTP-Content-Address-EACs](https://github.com/protocol/FilecoinGreen-tools/blob/main/0004-FGTP-Content-Address-EACs.md)

### Demo

[https://filecoin-green-eac-browser.dzunic.net/](https://filecoin-green-eac-browser.dzunic.net/)

### Use

Open-source [PDF.js](https://mozilla.github.io/pdf.js/) library is integrated into our project to render a PDF inside our app. After downloading the [latest stable release](https://mozilla.github.io/pdf.js/getting_started/#download) and then extracting the contents,
make sure `libs` folder is available in root directory of your project. Also, make sure your hosting address is added to `HOSTED_VIEWER_ORIGINS` in `viewer.js` file.

    const HOSTED_VIEWER_ORIGINS = ["null", "http://mozilla.github.io", "https://mozilla.github.io", "https://localhost:3000", "http://localhost:3000"];

You would also need an running IPFS node to attach to since this app is using `ipfs-http-client` lib.

Thereafter run any of scripts defined in `package.json`

    // clean dist
    npm run clean

    // build for production
    npm run build

    // run dev server with hot reload
    npm run start

### ToDo

1. Attestation documents filtering
2. Direct link to specific Attestation document

### License
Licensed under the MIT license.
http://www.opensource.org/licenses/mit-license.php
