# lacework-lql-explorer-extension

Lacework LQL Explorer chrome extension provides an alternative interface for lacework users to access LQL data.

## Getting Started

Currently this extension is in development and as such has yet to be published to the chrome extensions store. In order to test the extension use the following steps:

1. Clone the repo to your local machine.
2. Open chrome extensions `chrome://extensions`.
3. Enable `Developer mode` using the toggle on the top right.
4. Click the `Load unpacked` button and browse to the `extension` folder under your cloned repo directory.
5. You should now have a Lacework LQL Explorer extension.
6. Click the extenion to open up the explorer dialog. 
7. Click the gear icon on the top right to set your Lacework API credential information.
8. Save the credentials.
9. Click the `Show Query` button to start crafting your LQL query. Use the _eye_ to preview the sources.
10. When ready click the `Run Query` button to execute the query.
11. Results will be disabled in the `DataTable` at the bottom.

## Known limitation

1. LQL Data Source queries are limited to 5000 rows
2. DataTable explort may fail if the number of columns and data exceeds the memory limit in chrome. In this case reduce the number of fields or data.