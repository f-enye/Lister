$(document).ready(function(){
	$("#searchButton").on("click", function(){

		// Slide everything down a bit when the search bar is visible.
		// This is to accomidate the search bar being directly under the upper navbar elements.
		// Ideally this will be changed so that the search bar will fit between the two upper navbar
		// elements.
		$("body").css("padding-top", "240px");

		$("#searchForm").toggle();
		$("#searchButton").toggle();
	});

	$("#searchCancel").on("click", function(){

		// Slide everything back up.
		$("body").css("padding-top", "140px");

		$("#searchForm").toggle();
		$("#searchButton").toggle();
	});

	$("#searchConfirm").on("click", function(){
		var userNameQuery = $("#searchUsername").val();
		if( userNameQuery !== '' ){
			$.post(window.location.origin + "/search",
				{"user_name": userNameQuery, "csrf_token": $("#csrf_token").attr("value")},
				function(data){
					var shareListForm = $("#searchResultsModal").children(".modal-dialog").children(".modal-content").children(".modal-body").children(".shareListForm");
					
					var modalSearchResultsSection = shareListForm.children(".userSearchResults");
					var modalSearchResultsList = modalSearchResultsSection.children(".list-group");
					var modalSearchErrors = modalSearchResultsSection.children(".searchErrors");

					var modalListNameSetSection = shareListForm.children(".listNames");
					var modalListNamesSet = modalListNameSetSection.children(".list-group");
					var modalListNamesError = modalListNameSetSection.children(".listErrors");

					// Reset everything to the beginning state
					modalSearchResultsSection.show();
					modalListNameSetSection.hide();

					$(".backToUserSearchResults").hide();
					$(".forwardToListSet").hide();

					modalSearchResultsList.empty();
					modalSearchErrors.empty();

					modalListNamesSet.empty();
					modalListNamesError.empty();

					if(data["status"] === "success") {
						$.each( data["user_names"], function( index, value ) {
							var resultItemToAppend = $("<li></li>").addClass("list-group-item");
							var selectUserButton = $("<button></button>").addClass("selectUserButton btn btn-default").attr("type", "button").text("C").on("click", SelectUserButtonClicked);
							resultItemToAppend.append(selectUserButton);
							resultItemToAppend.append($("<p></p>").text(value["user_name"]));
							modalSearchResultsList.append(resultItemToAppend);
						});

						$.each( data["lists"], function( index, value ) {
							var listNameToAppend = $("<li></li>").addClass(" list-group-item").attr("name", value["list_id"]);
							var selectListButton = $("<button></button>").addClass("selectListButton btn btn-default").attr("type", "button").text("C").on("click", SelectListButtonClicked);
							listNameToAppend.append(selectListButton);
							listNameToAppend.append($("<p></p>").text(value["list_name"]));
							modalListNamesSet.append(listNameToAppend);
						});
					}
					else if(data["status"] === "failed"){
						modalSearchErrors.append($("<p></p>").text(data["errors"]));
						modalListNamesError.append($("<p></p>").text(data["errors"]));
					}
				});
		}
	});

	function SelectUserButtonClicked(evt){
		var selectUserButton = $(evt.target);

		if( selectUserButton.hasClass("btn-default") ) {
			var shareListForm = $("#searchResultsModal").children(".modal-dialog").children(".modal-content").children(".modal-body").children(".shareListForm");	
			var modalSearchResultsSection = shareListForm.children(".userSearchResults");
			var modalListNameSetSection = shareListForm.children(".listNames");

			$(".selectUserButton").removeClass("btn-primary");
			$(".selectUserButton").addClass("btn-default");
			
			selectUserButton.removeClass("btn-default");
			selectUserButton.addClass("btn-primary");

			modalSearchResultsSection.toggle();
			modalListNameSetSection.toggle();

			$(".backToUserSearchResults").toggle();

			if( $(".forwardToListSet").is(":visible") ) {
				$(".forwardToListSet").toggle();
			}
		}
	}

	function SelectListButtonClicked(evt){
		$(".selectListButton").removeClass("btn-primary");
		$(".selectListButton").addClass("btn-default");

		$(evt.target).removeClass("btn-default");
		$(evt.target).addClass("btn-primary");
	}

	$(".backToUserSearchResults").on("click", function(evt){
		var shareListForm = $("#searchResultsModal").children(".modal-dialog").children(".modal-content").children(".modal-body").children(".shareListForm");
		var modalSearchResultsSection = shareListForm.children(".userSearchResults");
		var modalListNameSetSection = shareListForm.children(".listNames");

		modalSearchResultsSection.toggle();
		modalListNameSetSection.toggle();

		$(".backToUserSearchResults").toggle();
		$(".forwardToListSet").toggle();
	});

	$(".forwardToListSet").on("click", function(evt){
		var shareListForm = $("#searchResultsModal").children(".modal-dialog").children(".modal-content").children(".modal-body").children(".shareListForm");
		var modalSearchResultsSection = shareListForm.children(".userSearchResults");
		var modalListNameSetSection = shareListForm.children(".listNames");

		modalSearchResultsSection.toggle();
		modalListNameSetSection.toggle();

		$(".forwardToListSet").toggle();
		$(".backToUserSearchResults").toggle();
	});

	$(".shareListButton").on("click", function(evt){
		var shareListForm = $("#searchResultsModal").children(".modal-dialog").children(".modal-content").children(".modal-body").children(".shareListForm");
		
		var modalSearchResultsSection = shareListForm.children(".userSearchResults");
		var modalSearchResultsList = modalSearchResultsSection.children(".list-group");

		var modalListNameSetSection = shareListForm.children(".listNames");
		var modalListNameSet = modalListNameSetSection.children(".list-group");

		// Get the username
		var username = modalSearchResultsList.find(".btn-primary").siblings("p").text();
		var listID = modalListNameSet.find(".btn-primary").parent().attr("name");

		if( username !== '' && listID !== '' ){
			$.post(window.location.origin + "/shareList",
				{"user_name": username, "list_id": listID, "csrf_token": $("#csrf_token").attr("value")},
				function(data){
					$(".backToUserSearchResults").hide();
					$(".forwardToListSet").hide();

					modalSearchResultsList.empty();
					modalListNameSet.empty();

					modalSearchResultsSection.hide();
					modalListNameSetSection.hide();
					console.log(data["status"]);
				});
		}
	});

});