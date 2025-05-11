// ================================

const OPENAI_MODEL = "gpt-4.1-nano";
const OPENAI_API_KEY = "<<OPENAI_API_KEY>>";
const GROUP_PROMPT = `<TAB_TITLE>(<TAB_URL>) 탭이 그룹 [<GROUP_NAMES>] 중 어떤 그룹에 속하는지 찾아주세요. 속하지 않는 경우 새로운 그룹의 이름을 만들어서 새로운 그룹의 이름을 반환해 주세요. 그룹 이름은 최대한 간결하게 지어주세요. 그룹 이름만 알려주세요.`;

// ================================

chrome.tabs.onCreated.addListener(async (tab) => {
    if (tab.url === "chrome://newtab/" || tab.url === "about:blank" || tab.url.length <= 0) {
        return;
    }
    
    setTabGroup(tab);
});

chrome.tabs.onUpdated.addListener(async (_, changeInfo, tab) => {
    if (tab.url === "chrome://newtab/" || tab.url === "about:blank" || tab.url.length <= 0) {
        return;
    }

    if (changeInfo.status !== "complete") return;

    setTabGroup(tab);
});

async function setTabGroup(tab) {
    const tabGroups = await chrome.tabGroups.query({});
    const groupNames = tabGroups.map(group => group.title);

    const res = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
            model: OPENAI_MODEL,
            input: GROUP_PROMPT.replace("<GROUP_NAMES>", groupNames.join(",")).replace("<TAB_TITLE>", tab.title).replace("<TAB_URL>", tab.url),
        }),
    });
    const output = (await res.json()).output[0].content[0].text.replace("\"", "");
    
    const alreadyExists = (await chrome.tabGroups.query({})).find(group => group.title === output);
    if (alreadyExists) {
        await chrome.tabs.group({
            tabIds: [tab.id],
            groupId: alreadyExists.id,
        });
    } else {
        const groupId = await chrome.tabs.group({
            tabIds: [tab.id]
        });
        chrome.tabGroups.update(groupId, {
            title: output,
        });
    }
}