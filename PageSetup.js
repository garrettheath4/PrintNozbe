function submitPrintForm(event) {
	var loginKey = $("#loginKey").val();
	var projectId = $("#projectId").val();
	popupInitMessage = {
		purpose: "getNozbeData",
		loginKey: loginKey,
		projectId: projectId
	};
	chrome.runtime.sendMessage(popupInitMessage, function(response) {
		console.log("Successfully sent getNozbeData message from PageSetup popup");
	});
	saveFormPrefs();
	event.preventDefault();
	return false;
}

function loadPrefs() {
	chrome.storage.sync.get(['loginKey', 'lastProjectId'], prefillPrintForm);
}

function prefillPrintForm(prefData) {
	if (prefData.loginKey && !$("#loginKey").val()) {
		$("#loginKey").val(prefData.loginKey);
	}
	if (prefData.lastProjectId && !$("#projectId").val()) {
		$("#projectId").val(prefData.lastProjectId);
	}
}

//deprecated
function saveFormPrefs() {
	console.log("Warning: saveFormPrefs() is a deprecated method.");
	if ($("#loginKey").val()) {
	   saveLoginKeyPref($("#loginKey").val());
	}
	if ($("#projectId").val()) {
   		saveLastProjectIdPref($("#projectId").val());
	}
}


$(function() {
	loadPrefs();
	chrome.browserAction.onClicked.addListener(loadPrefs);
	$("#printForm").submit(submitPrintForm);
});
