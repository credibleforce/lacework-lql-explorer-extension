chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    switch (request.action) {
        case "getToken":
            getToken(request.config).then(tokenData => sendResponse({success: true, tokenData}))
                                .catch(error => sendResponse({success: false, error: error.message}));
            break;
        case "getDataSources":
            getDataSources(request.tokenData, request.config).then(data => {
                sendResponse({success: true, data});
            }).catch(error => {
                sendResponse({success: false, error: error.message});
            });
            break;
        case "previewSource":
            executeQuery(request.queryData, request.tokenData, request.config).then(data => sendResponse({success: true, data}))
                                                                .catch(error => sendResponse({success: false, error: error.message}));
            break;
        case "runQuery":
            executeQuery(request.queryData, request.tokenData, request.config).then(data => sendResponse({success: true, data}))
                                                                .catch(error => sendResponse({success: false, error: error.message}));
            break;
    }
    return true; // Keep the message channel open for the response
});


async function executeQuery(queryData, tokenData, config) {
    const authHeaders = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenData.token}`
    };
    const queryExecuteURI = `https://${config.laceworkAccountName}/api/v2/Queries/execute`;
    try {
        const response = await fetch(queryExecuteURI, {
            method: 'POST',
            headers: new Headers(authHeaders),
            body: JSON.stringify(queryData)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Failed to execute query:", error);
        throw error;  // Re-throw the error for further handling
    }
}
       

async function getToken(config) {
    const tokenHeaders = {
        'Content-Type': 'application/json',
        'X-LW-UAKS': config.laceworkAPISecretKey
    };
    const tokenPostData = {
        "keyId": config.laceworkAPIKey, 
        "expiryTime": 3600
    };
    const accessTokenAPI = `https://${config.laceworkAccountName}/api/v2/access/tokens`;
    try {
        const response = await fetch(accessTokenAPI, {
            method: 'POST',
            headers: new Headers(tokenHeaders),
            body: JSON.stringify(tokenPostData)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Failed to execute query:", error);
        throw error;  // Re-throw the error for further handling
    }
}

async function getDataSources(tokenData, config) {
    const authHeaders = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenData.token}`
    };
    const dataSourcesURI = `https://${config.laceworkAccountName}/api/v2/Datasources`;
    try {
        const response = await fetch(dataSourcesURI, {
            method: 'GET',
            headers: new Headers(authHeaders),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Failed to execute query:", error);
        throw error;  // Re-throw the error for further handling
    }
}

chrome.action.onClicked.addListener(function(tab) {
    chrome.windows.getCurrent(function(win) {
        var width = 800;
        var height = 600;
        chrome.system.display.getInfo(function(display){
            var left = ((win.width / 2) - (width / 2)) + win.left;
            var top = ((win.height / 2) - (height / 2)) + win.top;

            chrome.windows.create({
                url: 'popup.html',
                width: width,
                height: height,
                top: Math.round(top),
                left: Math.round(left),
                type: 'popup'
            });
        })
        
     });
});
