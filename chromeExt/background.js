chrome.runtime.onInstalled.addListener(() => {
  chrome.action.setBadgeText({
    text: "OFF",
  });
  // chrome.tabs.create({
  //   url: "popup.html"
  // });
});

async function getCurrentTab() {
  let queryOptions = { active: true, lastFocusedWindow: true };
  // `tab` will either be a `tabs.Tab` instance or `undefined`.
  let [tab] = await chrome.tabs.query(queryOptions);
  return tab;
}

const notionWebsite = "https://notion.so/*"

const filter = {
  url: [
    {
      urlMatches: notionWebsite,
    },
  ],
};

chrome.tabs.onActivated.addListener((activeInfo) => {
  console.log(activeInfo)
  console.log("helloooooo look at me")
});

// chrome.webNavigation.onCompleted.addListener(() => {
//   // console.info("The user has loaded my favorite website!");
//   tab.create({ url: "popup.html" });
// }, filter);

// chrome.tabs.onActivated.addListener(async (tab) => {
//   console.log(tab)
//   // if (tab.url.startsWith(notionWebsite)) {
//   //   // Set the action badge to the next state
//   //   await chrome.action.setBadgeText({
//   //     tabId: tab.id,
//   //     text: "ON",
//   //   });
//   // } else {
//   //   await chrome.action.setBadgeText({
//   //     tabId: tab.id,
//   //     text: "OFF",});
//   // }
// });
