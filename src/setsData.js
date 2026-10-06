// ---------------------------------------------------------------------------
// Bunny Stream — NON-SENSITIVE playback values only.
//
// Never put your Bunny API key or Token Authentication key in this file (or
// anywhere in the React code): everything in a React app is downloadable by
// anyone who visits the site. The two values below are public by design.
// ---------------------------------------------------------------------------

export const BUNNY_LIBRARY_ID = "764387";

// Your library's CDN hostname, e.g. "vz-1a2b3c4d-5e6.b-cdn.net" (no https://).
// Find it in the Bunny dashboard: Stream -> your library -> "API" tab ->
// "CDN Hostname" (also called the Pull Zone hostname).
//
// While this is empty, the site falls back to Bunny's own embedded player so
// nothing breaks. Once you paste the hostname, the custom player takes over.
export const BUNNY_CDN_HOSTNAME = "";

// One entry per DJ set. To add a new set later: upload it to Bunny, copy its
// Video ID, and add another line here.
export const SET_VIDEOS = [
  {
    id: "4e0d5bc0-b39c-4b75-8087-3cebddbce6d2",
    title: "DJ SET 01",
  },
];
