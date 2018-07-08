# ReLinks
This is a site for Relating Research Papers. Providing the Relations and Linkages between Research Works.

You can add papers found in arXiv into ReLinks and ReLinks will extract the papers mentioned in Related Sessions.

This git is server side code.

Page: https://victor77dev.github.io/relinks-client

Client code: https://github.com/victor77dev/relinks-client

## Major Tools
* Express (https://expressjs.com)
* Mongoose
   > for MongoDB
* Axios
   > for basic server & client interaction (api calls)
* Pdf Js (https://github.com/mozilla/pdfjs-dist)
   > for Pdf reading and parsing
* xml2js Js (https://github.com/Leonidas-from-XIV/node-xml2js)
   > for xml data reading (data from arxiv api call)
* arXiv api (https://arxiv.org)
   > for finding papers and download papers (pdf and info)
* FreeCite api (http://freecite.library.brown.edu)
   > for parsing paper info from reference
