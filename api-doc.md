## Api calls
* /addPaper
   > Add Paper to DB

   > GET request

   > Params:
   > * title: Paper title (Required)
   > * paperId: Paper DB Id (Optional)

   > Return:
   > * paperId: Paper DB Id
   > * relatedPaper: Related Paper List
   > * link: Linked Paper List

   > Return (Error):
   > * dbError: DB Error Message
   > * arxivNotFound: Error Message when paper is not found in arXiv
   > * arxivSimilar: Similar paper found in arXiv when the title is not found in arXiv
   > * error: Error Message
   > * paperExist: Paper existence (Only when error is not null)

* /searchPaper
   > Search Paper (5 results) from DB by searching in title, author or summary

   > GET request

   > Params:
   > * search: Search query (Required)

   > Return:
   > Array of paper info
   > * arxiv: arXiv info (title, link, pdf, summary, author(in array), updated, published)
   > * ref: Reference info
   > * \_id: Paper Id
   > * title: Paper title

* /getPaper
   > Get Paper from DB by Paper Id

   > GET request

   > Params:
   > * id: Paper Id (Required)

   > Return:
   > Paper info
   > * arxiv: arXiv info (title, link, pdf, summary, author(in array), updated, published)
   > * ref: Reference info
   > * \_id: Paper Id
   > * title: Paper title

   > Return (Error):
   > * error: DB Error Message

* /getLink
   > Get Paper Link info DB by Paper Id

   > GET request

   > Params:
   > * id: Paper Id (Required)

   > Return:
   > * previous: Papers mentioned in this paper. Paper Info: {id: Old Paper Id, details: {foundParagraph: Paragraph that found the mentioned paper}}
   > * next: New papers that mentioned this paper. Paper Info: {id: New Paper Id, details: {foundParagraph: Paragraph in new paper that mentioned current paper}}
   > * \_id: Current Paper Id
   > * title: Paper title

   > Return (Error):
   > * error: DB Error Message

 * /getLinkDetails
   > Get Paper Link info DB by Paper Id (like /getLink, but includes detail Paper Info array)

   > GET request

   > Params:
   > * id: Paper Id (Required)

   > Return:
   > * previous: Papers mentioned in this paper. Paper Info: {id: Old Paper Id, details: {foundParagraph: Paragraph that found the mentioned paper}}
   > * next: New papers that mentioned this paper. Paper Info: {id: New Paper Id, details: {foundParagraph: Paragraph in new paper that mentioned current paper}}
   > * previousPaper: Array of 'previous' Paper info details (arxiv info, ref info same as data from /getPaper)
   > * nextPaper: Array of 'next' Paper info details (arxiv info, ref info same as data from /getPaper)
   > * \_id: Current Paper Id
   > * title: Paper title

   > Return (Error):
   > * error: Error Message

 * /updatePaperArxiv
   > Update Paper arXiv info DB with arXiv object

   > GET request

   > Params:
   > * id: Paper Id (Required)
   > * paperInfo: Paper Info in arXiv object format like in /getPaper (Required)

   > Return:
   > * id: Paper Id
   > * paper: Upadated Paper info (arXiv info, ref info data like in /getPaper)

   > Return (Error):
   > * HTTP 500

 * /updatePaperRef
   > Update Paper reference info DB with ref object

   > GET request

   > Params:
   > * id: Paper Id (Required)
   > * paperInfo: Paper Info in ref object format like in /getPaper (Required)

   > Return:
   > * id: Paper Id
   > * paper: Upadated Paper info (arXiv info, ref info data like in /getPaper)

   > Return (Error):
   > * HTTP 500

 * /updatePaper
   > Update Paper info (both reference and arXiv) DB

   > GET request

   > Params:
   > * id: Paper Id (Required)
   > * paperInfo: Paper Info in object format like in /getPaper (Required)

   > Return:
   > * id: Paper Id
   > * paper: Upadated Paper info (arXiv info, ref info data like in /getPaper)

   > Return (Error):
   > * HTTP 500

 * /getPaperInfoFromArxiv
   > Search Paper (50 results) from arXiv by title (using arXiv api)

   > GET request

   > Params:
   > * title: Paper Id (Required)

   > Return:
   > * title: Searched title
   > * paper: Array of Paper info (arXiv info data like arxiv in /getPaper)

   > Return (Error):
   > * title: Searched title
   > * error: Error Message
