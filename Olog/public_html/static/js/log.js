/*
 * Functions specfic to edit and modify logs
 *
 * @author: Dejan Dežman <dejan.dezman@cosylab.com>
 */

var uploadData = [];
var firefoxPastedData = [];

function initialize() {
	// Create new comparator
	jQuery.expr[':'].Contains = function(a, i, m) {
		return (a.textContent || a.innerText || "").toUpperCase().indexOf(m[3].toUpperCase()) >= 0;
	};

	// Add upload field
	addAttachmentField();

	// Listen for add attachment link click
	$('#add_attachment').click(function(e) {
		addAttachmentField();
	});

	// Hide error block when user clicks on the X
	$('#error_x').click(function(e) {
		$('#error_block').hide("fast");
	});

	// Check if user is logged in and act accordingly
	if (getUserCreadentials() === null) {
		window.location.href = firstPageName + '?reason=not_logged_in';

		var template = getTemplate('template_logged_out');
		var html = Mustache.to_html(template, {"user": "User"});
		$('#top_container').html(html);
		login();

		$('#new_log').addClass("disabled");
		$('#new_log').attr("disabled", true);
		$('#new_logbook_and_tag').addClass("disabled");
		$('#new_logbook_and_tag').attr("disabled", true);

	} else {
		var credentials = getUserCreadentials();

		var template = getTemplate('template_logged_in');
		var html = Mustache.to_html(template, {"user": firstLetterToUppercase(credentials["username"])});
		$('#top_container').html(html);

		$('#new_log').removeClass("disabled");
		$('#new_log').attr("disabled", false);
		$('#new_logbook_and_tag').removeClass("disabled");
		$('#new_logbook_and_tag').attr("disabled", false);
	}

	// Listen to cancel or close click
	$('#cancel_editing_button').click(function(e){
		showCancelEditingLogModal();
	});

	$('#cancel_editing_x').click(function(e){
		showCancelEditingLogModal();
	});
}

/**
 * Add attachment field below the already existing one
 */
function addAttachmentField() {
	var template = getTemplate("template_new_add_attachment");

	var addAtachment = {
		'url': serviceurl
	};

	var html = Mustache.to_html(template, addAtachment);
	$('#list_add_attachments').append(html);

	/*$('.new_attachment').unbind("change");
	$('.new_attachment').on("change", function(e) {
		alert($(e.target).val());
	});*/
}

/**
 * Initialize Tags autocompletion input. Get already selected data from cookie and fill the autocompletion list with all the Tags.
 * @param {type} tagsArray array of all the tags
 */
function autocompleteTags(tagsArray) {
	var selectedTagsArray = [];

	if ($.cookie(filtersCookieName) !== undefined) {
		selectedTagsArray = $.parseJSON($.cookie(filtersCookieName))["list2"];
	}
	initiateAutocompleteInput("tags_input", selectedTagsArray, tagsArray);
}

/**
 * Initialize Logbooks autocompletion input. Get already selected data from cookie and fill the autocompletion list with all the Logbooks.
 * @param {type} logbooksArray array of all the tags
 */
function autocompleteLogbooks(logbooksArray) {
	var selectedLogbooksArray = [];

	if ($.cookie(filtersCookieName) !== undefined) {
		selectedLogbooksArray = $.parseJSON($.cookie(filtersCookieName))["list"];
	}
	initiateAutocompleteInput("logbooks_input", selectedLogbooksArray, logbooksArray);
}

/**
 * Prepare autocompletion object and fill it with given data.
 * @param {type} targetId id of the input on which we want to enable aoutcompletion
 * @param {type} preselectedArray array of preselected items (usually from the cookie)
 * @param {type} dataArray array of all the object available for autocompletion
 */
function initiateAutocompleteInput(targetId, preselectedArray, dataArray) {
	$("#" + targetId).tagsManager({
		prefilled: preselectedArray,
		typeahead: true,
		typeaheadSource: dataArray,
		onlyTagList: true
	});
	$("#" + targetId).trigger("tagsManager_initialized");
}

/**
 * Check if Log form is filled in correctly
 * @param log created or modified log object
 * @returns {undefined}
 */
function isValidLog(log) {
	var errorString = "";

	// Check description length
	if (log[0]["description"] === "") {
		errorString += "Log description cannot be empty!<br />";
	}

	// Check if there is at least one Logbook selected
	if (log[0]["logbooks"].length === 0) {
		errorString += "At least one Logbook should be selected!<br />";
	}

	// Check if user is logged in
	if (getUserCreadentials() === null) {
		errorString += "User is not logged in!<br />";
	}

	if (errorString.length === 0) {
		return true;

	} else {
		$('#error_body').html(errorString);
		$('#error_block').show("fast");
		return false;
	}
}

/*
 * Get Cancel Editing or Creating a Log from remote site, copy it to index and then show it
 */
function showCancelEditingLogModal(){
	$('#modal_container').load(modalWindows + ' #cancelEditingLogModal', function(response, status, xhr){
		$('#cancelEditingLogModal').modal('toggle');
	});
}

/**
 * When user confirms canceling editing or creating a Log, redirect him to a home page.
 * @returns {undefined}
 */
function deleteDraftAndReturnToHomePage() {
	window.location.href = firstPageName;
}

function upload(elementId) {
	// Change this to the location of your server-side upload handler:
	var url = serviceurl + "attachments/";
	var removeButton = $('<button/>')
			.addClass('btn')
			.prop('disabled', true)
			.prop('className', 'btn btn-danger')
			.on('click', function () {
				var $this = $(this);
				var data = $this.data();
				l(data);
				uploadData[data.filePos] = null;

				$this.parent().parent().remove();
				data.abort();
			});

	var p = $('<p/>');
	var pIndex = 0;

	$('#' + elementId).fileupload({
		url: url,
		dataType: 'json',
		autoUpload: false,
		//dropZone: null,
		//pasteZone: null,
		//acceptFileTypes: /(\.|\/)(gif|jpe?g|png)$/i,
		maxFileSize: 5000000, // 5 MB
		// Enable image resizing, except for Android and Opera,
		// which actually support image resizing, but fail to
		// send Blob objects via XHR requests:
		disableImageResize: /Android(?!.*Chrome)|Opera/
			.test(window.navigator && navigator.userAgent),
		previewMaxWidth: 100,
		previewMaxHeight: 100,
		previewCrop: true

	}).on('fileuploadadd', function (e, data) {
		data.context = $('<div/>').appendTo('#files');
		$.each(data.files, function (index, file) {
			var newP = p.clone(true);
			newP.prop('id', pIndex);
			pIndex += 1;

			var node = newP.append($('<span/>').text(file.name));
			if (!index) {
				var count = uploadData.length;
				data.filePos = count;
				data.node = newP;
				uploadData.push(data);
				node
					.append('<br>')
					.append(removeButton.clone(true).data(data));
				//l(data);
			}
			node.appendTo(data.context);
		});

	}).on('fileuploadprocessalways', function (e, data) {
		var index = data.index,
			file = data.files[index];
			var node = $(data.context.children()[index]);

		if (file.preview) {
			node
				.prepend('<br>')
				.prepend(file.preview);
		}
		if (file.error) {
			node
				.append('<br>')
				.append(file.error);
		}
		if (index + 1 === data.files.length) {
			data.context.find('button')
				.text('Remove')
				.prop('disabled', !!data.files.error);
		}

	});/*.on('fileuploadprogressall', function (e, data) {
		var progress = parseInt(data.loaded / data.total * 100, 10);
		l(progress);
		$('#progress .bar').css(
			'width',
			progress + '%'
		);

	}).on('fileuploaddone', function (e, data) {
		$.each(data.files, function (index, file) {
			$('#progress .bar').css('width', '0%');
		});

	}).on('fileuploadfail', function (e, data) {
		$.each(data.result.files, function (index, file) {
			var error = $('<span/>').text(file.error);
			$(data.context.children()[index])
				.append('<br>')
				.append(error);
		});
	});*/
}


/* Creates a new image from a given source */
function createImage(source, index, targetId) {
	//uploadData.push(item);
	var fileName = 'pasted image';
	//uploadPastedFile(source, 3432)

	// Show pasted image
	var template = getTemplate('template_attachment_item');
	var html = Mustache.to_html(template, {"img": source, "img_name":fileName, "array_id":index});
	$(targetId).append(html);
}

function removePastedAttachment(element, id) {
	firefoxPastedData[id] = null;
	$(element).parent().remove();
}