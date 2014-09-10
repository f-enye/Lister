$(document).ready(function(){

	var socket = io.connect('http://' + document.domain + ':' + location.port + "/item" );

	// Check if a connection has been established.
	socket.on('connection status', function(msg) {
		console.log(msg.data);
		socket.emit("join", {room: getListID()});
	});

	socket.on('room status', function(msg) {
		console.log(msg.data);
	});

	socket.on('disconnect', function(msg) {
		// I might not have to do this since being disconnected should be enough.
		console.log("Item: Disconnected!");
	});

	$('#addItemButton').on("click", function() {
		$("#addItemForm").toggle();
		$("#addItemButton").toggle();
	});

	$("#addItemFormCancel").on("click", function(){
		$("#addItemForm")[0].reset();
		$("#addItemButton").toggle();
		$("#addItemForm").toggle();
		$("#addItemFormError").text("");
	});

	$("#addItemFormSubmit").on("click", function(){
		var item_name = $("#addItemName").val();

		if(item_name !== '')
		{
			var list_id = getListID();

			// Send the item data to the server.
			socket.emit("add item", {list_id: list_id, item_name: item_name, csrf_token: $("#csrf_token").attr('value')});
		}
	});

	socket.on('add item success', function(msg){
		$("#addItemFormError").children("p").remove();
		$("#addItemForm")[0].reset();
		var addToItemList = $("<li></li>").attr("id", msg["itemID"]).addClass("list-group-item");
		
		var editItemForm = $("<form></form>").addClass("editItemForm").css("display", "none");
		editItemForm.append($("<div></div>").addClass("form-group").prepend($("<input/>").attr("type", "text").attr("required", "required").addClass("editItemName form-control").attr("name", "name").attr("placeholder", "Enter new item name")).prepend($("<div></div>").addClass("editItemFormError").prepend($("<p></p>"))));
		editItemForm.append($("<button></button>").addClass("editItemFormSubmit btn btn-default").attr("type", "button").text("C").on("click", editItemFormSubmitButtonClicked));
		editItemForm.append("\n");
		editItemForm.append($("<button></button>").addClass("editItemFormCancel btn btn-default").attr("type", "button").text("X").on("click", editItemFormCancelButtonClicked));
		editItemForm.append("\n");
		addToItemList.append(editItemForm);

		var deleteConfirmationButtons = $("<div></div>").addClass("deleteItemConfirmationButtons").css("display", "none");
		deleteConfirmationButtons.append($("<button></button>").addClass("deleteItemYes btn btn-default").text("C").on("click", deleteItemYesButtonClicked));
		deleteConfirmationButtons.append("\n");
		deleteConfirmationButtons.append($("<button></button>").addClass("deleteItemNo btn btn-default").text("X").on("click", deleteItemNoButtonClicked));
		deleteConfirmationButtons.append("\n");
		deleteConfirmationButtons.append($("<div></div>").addClass("deleteItemError").append($("<p></p>")));
		addToItemList.append(deleteConfirmationButtons);
		
		addToItemList.append($("<button></button>").addClass("checkItemButton btn btn-default").text("C").on("click", checkItemButtonClicked));
		addToItemList.append("\n");
		addToItemList.append($("<button></button>").addClass("editItemButton btn btn-default").text("E").on("click", editItemButtonClicked));
		addToItemList.append("\n");
		addToItemList.append($("<button></button>").addClass("deleteItemButton btn btn-default").text("D").on("click", deleteItemButtonClicked));
		addToItemList.append("\n");
		addToItemList.append($("<p></p>").text(msg["itemName"]));

		var listItem = $("#itemList").prepend( addToItemList );	

	});

	socket.on('add item fail', function(msg){
		$("#addItemForm")[0].reset();

		var itemNameArea = $("#addItemFormError").children("p");
		itemNameArea.text(msg["errors"]);
	});

	socket.on('update item success', function(msg){
		var listItem = $("#itemList").children("#" + msg["itemID"]);
		var itemName = listItem.children("p");

		// update the item Name.
		itemName.text(msg["itemName"]);

		// item name not visible?, show the name elements and the modification buttons again.
		if( !(listItem.children("p").is(":visible")) )
		{
			listItem.children("p").toggle();
			listItem.children("button").toggle();			
		}

		// reset the form.
		var updateForm = listItem.children(".editItemForm");
		updateForm[0].reset();

		// If the form is visible, hide it.
		if(updateForm.is(":visible"))
		{
			updateForm.toggle();			
		}
	});

	socket.on('update item fail', function(msg){
		var listItem = $("#itemList").children("#" + msg["itemID"]);
		var updateForm = listItem.children(".editItemForm");

		updateForm.children(".form-group").children(".editItemFormError").children("p").text(msg["errors"]);
	});

	socket.on('check item success', function(msg){
		var checkButton = $("#itemList").children("#" + msg["itemID"]).children(".checkItemButton");
		if(checkButton.hasClass("btn-default")){
			checkButton.removeClass("btn-default");
			checkButton.addClass("btn-success");
		}
		else if( checkButton.hasClass("btn-success")){
			checkButton.removeClass("btn-success");
			checkButton.addClass("btn-default");
		}
	});
	
	function getListID(){
		// Get the list id from the pathname
		var pathElements = window.location.pathname.replace(/\/$/, '').split('/')
		return pathElements[pathElements.length - 1]
	}

	function editItemButtonClicked(evt){
		// Show the update form.
		// Hide the name and modification buttons.
		var listItem = $(evt.target).parent();
		listItem.children(".editItemForm").toggle();
		listItem.children("button").toggle();
		listItem.children("p").toggle();
	}

	function editItemFormCancelButtonClicked(evt){
		var form = $(evt.target).parent();
		var listItem = form.parent();
		form[0].reset();
		form.toggle();
		listItem.children("button").toggle();
		listItem.children("p").toggle();
		form.children(".form-group").children(".editItemFormError").children("p").text("");
	}

	function deleteItemButtonClicked(evt){
		var listItem = $(evt.target).parent();
		listItem.children(".deleteItemConfirmationButtons").toggle();
		listItem.children("button").toggle();
	}

	function deleteItemYesButtonClicked(evt){
		var deleteConfirmationArea = $(evt.target).parent();
		var listItem = deleteConfirmationArea.parent();
		var id = listItem.attr("id");

		$.post(window.location.pathname + "/deleteItem/" + id,
			{"csrf_token": $("#csrf_token").attr("value")},
			function(data){
				if(data["status"] === "success"){
					listItem.remove();
				}
				else if( data["status"] === "failed"){
					deleteConfirmationArea.children(".deleteItemError").children("p").text(data["errors"]);
				}
			});
	}

	function deleteItemNoButtonClicked(evt){
		var deleteConfirmationArea = $(evt.target).parent();
		var listItem = deleteConfirmationArea.parent();

		deleteConfirmationArea.toggle();
		listItem.children("button").toggle();
	}

	function editItemFormSubmitButtonClicked(evt){
		updateForm = $(evt.target).parent();
		var listItem = updateForm.parent();
		var item_name = updateForm.children("div").children(".editItemName").val();
		var item_id = listItem.attr("id");

		if(item_name !== ''){
			var list_id = getListID();
			socket.emit('update item', {"list_id": list_id, "item_id": item_id, "item_name": item_name, "csrf_token": $("#csrf_token").attr('value')});
		}
	}

	function checkItemButtonClicked(evt){
		checkButton = $(evt.target);
		listItem = checkButton.parent();
		id = listItem.attr("id");
		var check = false;

		if(checkButton.hasClass("btn-default")){
			check = true;
		}
		else if(checkButton.hasClass("btn-success")){
			check = false;
		}
		else
		{
			console.log("This state is unhandled.")
		}
		socket.emit('check item', {"list_id": getListID(), "item_id": id, "check": check, "csrf_token": $("#csrf_token").attr('value')});
	}

	$(".editItemButton").on("click", editItemButtonClicked);

	$(".editItemFormCancel").on("click", editItemFormCancelButtonClicked);

	$(".deleteItemButton").on("click", deleteItemButtonClicked);

	$(".deleteItemYes").on("click", deleteItemYesButtonClicked);

	$(".deleteItemNo").on("click", deleteItemNoButtonClicked);

	$(".editItemFormSubmit").on("click", editItemFormSubmitButtonClicked);

	$(".checkItemButton").on("click", checkItemButtonClicked);
});