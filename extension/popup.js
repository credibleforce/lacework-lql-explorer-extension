async function fetchConfig() {
    const laceworkConfig = await chrome.storage.local.get(["laceworkAccountName", "laceworkAPIKey", "laceworkAPISecretKey"]);
    return new Promise((resolve, reject) => {
        resolve(laceworkConfig)
    });
}

async function fetchToken() {
    const laceworkConfig = await fetchConfig();
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({action: "getToken", config: laceworkConfig}, response => {
            if (response.success) {
                resolve(response.tokenData);
            } else {
                reject(response.error);
            }
        });
    });
}

async function previewSource() {
    $('#queryLoader').modal('show');
    try {
        const laceworkConfig = await fetchConfig();
        const tokenData = await fetchToken();
        const lqlSource = $('#lqlSource').val();
        const lqlQueryText = `{
            source {
                ${lqlSource} s
            }
            return {
                s.*
            }
        }`.replace(/\r?\n|\r/g, " ");
        var startDate = $('#lqlTimeRange').data('daterangepicker').startDate.toISOString();
        var endDate = $('#lqlTimeRange').data('daterangepicker').endDate.toISOString();
        const queryData = {
            query: {
                queryText: lqlQueryText
            },
            options: {
                limit: 1
            },
            arguments: [
                { name: "StartTimeRange", value: startDate },
                { name: "EndTimeRange", value: endDate }
            ]
        };
        const data = await new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({action: "previewSource", queryData: queryData, tokenData: tokenData, config: laceworkConfig}, response => {
                if (response.success) {
                    resolve(response.data);
                } else {
                    reject(response.error);
                }
            });
        });
        $('#preview').html("\n"+JSON.stringify(data.data[0], null, 2));
        $('#previewSourceContent').modal('show'); 
        Prism.highlightAll();
    } catch (error) {
        $('#userMessageDialog .modal-title').text("Error")
        $('#userMessageDialog .modal-body').text(`Error running preview query: ${error}`);
        $('#userMessageDialog').modal('show');
    } finally {
        $('#queryLoader').modal('hide');
    }
    
}

async function runQuery() {
    $('#queryLoader').modal('show');
    try {
        const laceworkConfig = await fetchConfig();
        const tokenData = await fetchToken();
        const lqlSource = $('#lqlSource').val();
        const lqlFilter  = $('#lqlFilter').val() 
        const lqlFilterQuery = lqlFilter != "" ? `filter {
            ${lqlFilter}
        }` : ""
        const lqlReturnDistinct =  $('#lqlReturnDistinct').is(":checked");
        const lqlReturnDistinctQuery = lqlReturnDistinct ? "return distinct" : "return"
        const lqlReturn  = $('#lqlReturn').val() 
        const lqlReturnQuery = lqlReturn != "" ? `${lqlReturnDistinctQuery} {
            ${lqlReturn}
        }` :  `return {
        s.*
        }`
        const lqlAdvancedSource = $('#lqlAdvancedSourceInput').val() 
        const lqlAdvancedSourceQuery = lqlAdvancedSource != "" ? lqlAdvancedSource : ""
        const lqlQueryText = `{
            source {
                ${lqlSource} s
                ${lqlAdvancedSourceQuery}
            }
            ${lqlFilterQuery}
            ${lqlReturnQuery}
        }`.replace(/\r?\n|\r/g, " ")

        var startDate = $('#lqlTimeRange').data('daterangepicker').startDate.toISOString();
        var endDate = $('#lqlTimeRange').data('daterangepicker').endDate.toISOString();
        const queryData = {
            "query": {
            "queryText": lqlQueryText
            },
            "arguments": [
                {
                    "name": "StartTimeRange", 
                    "value": startDate
                },
                {
                    "name": "EndTimeRange", 
                    "value": endDate
                }
            ]
        }
        const data = await new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({action: "runQuery", queryData: queryData, tokenData: tokenData, config: laceworkConfig}, response => {
                if (response.success) {
                    resolve(response.data);
                } else {
                    reject(response.error);
                }
            });
        });

        // reset the data table
        $('#lql-table').DataTable().destroy();
        
        // populate table with data from query
        const queryColumnsFilter = []
        const table = document.querySelector('#lql-table');
        table.innerHTML = '';
        const columnFilters = queryColumnsFilter
        var headerComplete = false

        var tableHeader  = document.createElement('thead');
        tableHeader.className = "thead-light";
        var tableBody  = document.createElement('tbody');
        Object.keys(data.data).forEach(row => {
            // Headers
            if (!headerComplete){
            
                var headerRow  = document.createElement('tr');
                Object.keys(data.data[row]).forEach(key => {
                    if (columnFilters.length == 0 || (columnFilters.length > 0 && columnFilters.includes(key))){
                        var header = document.createElement('th');
                        header.textContent = key;
                        headerRow.appendChild(header);
                    }
                });
                tableHeader.appendChild(headerRow)
                table.appendChild(tableHeader);
                table.appendChild(tableBody);
                headerComplete = true;
            }
            
            // Data rows
            var dataRow  = document.createElement('tr');
            Object.keys(data.data[row]).forEach(key => {
                if (columnFilters.length == 0 || (columnFilters.length > 0 && columnFilters.includes(key))){
                    var cell = document.createElement('td');
                    cell.classList.add('overflow-auto');
                    dataRow.appendChild(cell)
                    if (typeof data.data[row][key] === 'object' && data.data[row][key] !== null) {
                        const pre = document.createElement('pre');
                        pre.classList.add('language-javascript');
                        const code = document.createElement('code');
                        code.classList.add('language-javascript')
                        code.textContent = JSON.stringify(data.data[row][key], null, 2);
                        pre.appendChild(code);
                        cell.appendChild(pre);
                    } else {
                        if (data.data[row][key] !== null){
                            cell.textContent = data.data[row][key];
                        }else{
                            cell.innerHTML = "&nbsp;";
                        }
                    }
                }
            });
            tableBody.appendChild(dataRow);
        });
        DataTable.ext.errMode = 'none';
        dt = $('#lql-table')
            .on('error.dt', function (e, settings, techNote, message) {
                console.log('An error has been reported by DataTables: ', message);
            }).DataTable({
                layout: {
                    topStart: {
                        buttons: ['copy', 'csv', 'excel', 'pdf', 'print']
                    }
                },
                fixedColumns: true,
                scrollCollapse: true,
                scrollX: true,
                pagingType: 'full'
            });
        dt.on('page', function () {
            setTimeout(function() {
                Prism.highlightAll();
            }, 100);
        });
        dt.on('order', function () {
            setTimeout(function() {
                Prism.highlightAll();
            }, 100);
        });
        dt.on('search.dt', function () {
            setTimeout(function() {
                Prism.highlightAll();
            }, 100);
        });
        
        // $('#lql-table').DataTable().columns.adjust().draw();
        Prism.highlightAll();
    } catch (error) {
        console.log(error)
        $('#userMessageDialog .modal-title').text("Error");
        $('#userMessageDialog .modal-body').text(`Error running query: ${error}`);
        $('#userMessageDialog').modal('show');
    } finally {
        $('#queryLoader').modal('hide');
    }
}

async function fetchDataSources(tokenData, laceworkConfig) {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({action: "getDataSources", tokenData: tokenData, config: laceworkConfig}, response => {
            if (response.success) {
                resolve(response.data);
            } else {
                reject(response.error);
            }
        });
    });
}

// Usage:
async function loadDataSources() {
    try {
        const laceworkConfig = await fetchConfig();
        const tokenData = await fetchToken();
        const dataSources = await fetchDataSources(tokenData, laceworkConfig);

        let dropdown = $('#lqlSource');
        dropdown.empty();
        dropdown.append('<option selected="true" disabled>Choose LQL Source...</option>');
        dropdown.prop('selectedIndex', 0);
        $.each(dataSources.data, function(index, value) {
            dropdown.append($("<option />").val(value["name"]).text(value["name"]));
        });
        
        dropdown.selectpicker({
            "width": "550px",
            "container": "body"
        });
    } catch (error) {
        $('#userMessageDialog .modal-title').text("Error")
        $('#userMessageDialog .modal-body').text(`Failed to load data sources: ${error}`);
        $('#queryLoader').modal('hide');
        $('#userMessageDialog').modal('show');
        
    }
}

$( "#search_button" ).on( "click", function() {
    runQuery().then(result => {}); 
});

$( "#previewSource" ).on( "click", function(e) {
    previewSource().then(result => {});
});
  
  
$( "#laceworkAPISettingsSave" ).on( "click", function() {
    $( "#laceworkAPISettings button, #laceworkAPISettings input").prop('disabled', true);
    var payload = { 
      "laceworkAccountName": $("#laceworkAccountName").val(),
      "laceworkAPIKey": $("#laceworkAPIKey").val(),
      "laceworkAPISecretKey": $("#laceworkAPISecretKey").val(),
    }
    chrome.storage.local.set(payload).then(() => {
        // setup datasources
        loadDataSources().then(() => {
            $( "#laceworkAPISettings button, #laceworkAPISettings input").prop('disabled', false);
        });
    });
})
  
$( document ).ready(function() {
    // init daterange picker
    $('#lqlTimeRange').daterangepicker({
        timePicker: true,
        startDate: moment().add(-24,'hour'),
        endDate: moment(),
        locale: {
            format: 'YYYY/MM/DD hh:mm A'
        }
    });

    // init data tables
    dt = new DataTable('#lql-table', {
        layout: {
            topStart: {
                buttons: ['copy', 'csv', 'excel', 'pdf', 'print']
            }
        },
        fixedColumns: true,
        scrollCollapse: true,
        scrollX: true,
        pagingType: 'full'
    })

    // setup api config
    chrome.storage.local.get(["laceworkAccountName", "laceworkAPIKey", "laceworkAPISecretKey"]).then((result) => {
        if (result["laceworkAccountName"] === undefined || result["laceworkAPIKey"] === undefined || result["laceworkAPISecretKey" === undefined ]){
            $('#userMessageDialog .modal-title').text("Getting started")
            $('#userMessageDialog .modal-body').text('Please set Lacework API credentials using the gear icon');
            $('#userMessageDialog').modal('show');
        }else{
            $("#laceworkAccountName").val(result["laceworkAccountName"]);
            $("#laceworkAPIKey").val(result["laceworkAPIKey"]);
            $("#laceworkAPISecretKey").val(result["laceworkAPISecretKey"]);

            // setup datasources
            loadDataSources();
        }
    });
});

window.onerror = function(error, url, line) {
    $('#userMessageDialog .modal-title').text("Error")
    $('#userMessageDialog .modal-body').text(`Datatable action failed: ${error}`);
    $('#userMessageDialog').modal('show');
    return true;
};