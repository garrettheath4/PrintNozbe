// background.js
// Lifecycle:
//   1. Registers popup message listener
//   2. Waits to receive message of init call from extension popup
//   3. Creates new PrintNozbe.html tab
//   4. Sends AJAX request to Nozbe for Nozbe task data
//   5. Waits to receive Nozbe task data response from Nozbe
//   6. Sorts tasks based on completion date
//   7. Sends Nozbe data to newly created PrintNozbe.html tab

function registerPopupListener() {
	// Step 1: Register popup message listener
	chrome.runtime.onMessage.addListener(popupListener);
}

function popupListener(request, sender, sendResponse) {
	// Step 2: Wait to receive message of init call from extension popup
	console.log(sender.tab ?
	            "message received from a content script: " + sender.tab.url :
	            "message received from the extension");
	if (request.purpose) {
		if (request.purpose == "getNozbeData") {
			console.log("Message received by background.js with the expected 'getNozbeData' purpose.");
			popupMessageHandler(request);
		} else {
			console.log("Message received by background.js with other purpose: '" + request.purpose + "'");
		}
	} else {
		console.log("Message received by background.js without a purpose.");
	}
}

function popupMessageHandler(message) {
	// Step 3: Create new PrintNozbe.html tab
	chrome.tabs.create({
		url: "PrintNozbe.html",
		active: true
	});
	
	savePrefData(message, fillDataFromPrefs);
}

function savePrefData(messageWithPrefs, callbackFn) {
	var saveData = {};
	if (messageWithPrefs.loginKey) {
		saveData.loginKey = messageWithPrefs.loginKey;
	}
	if (messageWithPrefs.projectId) {
		saveData.lastProjectId = messageWithPrefs.projectId;
	}
	chrome.storage.sync.set(saveData, callbackFn);
}

function fillDataFromPrefs(messageWithPrefs) {
	chrome.storage.sync.get(messageWithPrefs, getNozbeData);
}

function getNozbeData(requestData) {
	// Step 4: Send AJAX request to Nozbe for Nozbe task data
	var loginKey, projectId;
	
	if (requestData.loginKey) {
		loginKey = requestData.loginKey;
	} else {
		console.log("Error: No loginKey received for request");
		return;
	}
	
	if (requestData.projectId) {
		projectId = requestData.projectId;
	} else {
		if (requestData.lastProjectId) {
			projectId = requestData.lastProjectId;
		} else {
			console.log("Error: No projectId received for request");
			return;
		}
	}
	
	console.log("Sending task list request to Nozbe server");
	
	$.ajax({
		url: "https://webapp.nozbe.com/api/actions/what-project/id-" + projectId + "/showdone-1/key-" + loginKey,
		dataType: "json"
	}).done(nozbeResponseHandler("displayCompletedTasks")).fail(nozbeResponseFail).always(nozbeResponseComplete);
	
	$.ajax({
		url: "https://webapp.nozbe.com/api/actions/what-project/id-" + projectId + "/key-" + loginKey,
		dataType: "json"
	}).done(nozbeResponseHandler("displayIncompleteTasks")).fail(nozbeResponseFail).always(nozbeResponseComplete);
	
	console.log("Sent task list request to Nozbe server");
}

function nozbeResponseFail() {
	console.log("Error: Request to Nozbe server for task list failed!");
}

function nozbeResponseComplete() {
	console.log("Received a response from the Nozbe server after requesting task list");
}

//deprecated
function saveLoginKeyPref(loginKeyStr) {
	console.log("Warning: saveLoginKeyPref() is a deprecated method");
	chrome.storage.sync.set({'loginKey': loginKeyStr});
}

//deprecated
function saveLastProjectIdPref(projIdStr) {
	console.log("Warning: saveLastProjectIdPref() is a deprecated method");
	chrome.storage.sync.set({'lastProjectId': projIdStr});
}

// Step 5: Wait to receive Nozbe task data response from Nozbe
function nozbeResponseHandler(messagePurpose) {
	return function(nozbeData) {
		chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
			// Step 6: Sort tasks so that most recently completed tasks are at the top
			var sortedTasks = nozbeData.sort(taskDateComparator);
			
			// Prepare message with purpose and data
			var tasksMessage = {
				purpose: messagePurpose,
				data: sortedTasks
			};
			
			// Step 7: Send Nozbe data to newly created PrintNozbe.html tab
			chrome.tabs.sendMessage(tabs[0].id, tasksMessage, function(response) {
				console.log("Sent " + messagePurpose + " message to new PrintNozbe tab.");
			});
		});
	}
}

function taskDateComparator(left, right) {
	//TODO: Don't assume that the task's completion date was the current year
	var now = new Date();
	var year = now.getFullYear();
	var leftDate = 0;
	var rightDate = 0;
	if (left.done_time) {
		leftDate = Date.parse(left.done_time + " " + year);
	}
	if (right.done_time) {	
		rightDate = Date.parse(right.done_time + " " + year);
	}
	return leftDate > rightDate ? -1 :
			(leftDate == rightDate ? 0 : 1);
}


$(function() {
	registerPopupListener();
});

