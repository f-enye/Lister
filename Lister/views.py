from flask import render_template, flash, url_for, redirect, request, g, jsonify
from flask.ext.login import login_user, logout_user, current_user, login_required
from flask.ext.socketio import emit, disconnect, join_room, leave_room
from Lister import app, db, lm, socketio
from forms import LoginForm, SignupForm, ListForm, ItemForm, SearchForm, ShareListForm
from models import User, List, Item

@app.route('/')
@app.route('/index')
@login_required
def Index():
	return render_template_with_base_object("index.html")

@socketio.on('connect', namespace = '/item')
@login_required
def TestConnectionItem():
	# If the origin looks fishy...
	# Force a disconnect.
	if request.headers["Origin"] == request.headers["Origin"]:
		emit('connection status', {'data': 'Item: Connection Established!'})
		print "Item: Connection Established!"
	else:
		# Currently on disconnection, a connection keeps trying to get established.
		# This can be stopped if you set the reconnect flag to false on the client side.
		print"Item: Disconnected!"
		disconnect()

@socketio.on('disconnect', namespace = '/item')
@login_required
def TestDisconnectItem():
	print "Item: Disconnected!"

@socketio.on('join', namespace = '/item')
def on_join(data):
	Before_request()
	join_room(data["room"])

	roomStatus = g.user.user_name + " has entered room " + data["room"]

	print roomStatus
	emit('room status', {'data': g.user.user_name + " has entered room " + data["room"]}, room = data["room"])

@socketio.on('leave', namespace ='/item')
def on_leave(data):
	Before_request()
	leave_room(data["room"])

	roomStatus = g.user.user_name + " has left room " + data["room"]

	print roomStatus
	emit('room status', roomStatus, room = data["room"])

@app.route('/search', methods=['POST'])
@login_required
def Search():
	form = SearchForm()
	if form.validate_on_submit():
		user_name = form.user_name.data
		queryString = user_name + "%"
		userSearchResult = User.query.filter(User.user_name.like(queryString)).limit(10).all()

		if userSearchResult:
			# create versions of the results that are jsonifiable.
			userNames = [ user.serialize() for user in userSearchResult ]
			lists = [ gList.serialize() for gList in g.user.lists ]

			# We don't want the logged in user to appear in the search results.
			if {"user_name": g.user.user_name} in userNames:
				userNames.remove( {"user_name": g.user.user_name} )

			return jsonify({"status": "success", "user_names": userNames, "lists": lists})

		return jsonify({"status": "failed", "errors": "there is no user that goes by that alias."})
	return jsonify({"status": "failed", "errors": "invalid query was made."})

@app.route('/shareList', methods=['POST'])
@login_required
def ShareList():
	form = ShareListForm()
	if form.validate_on_submit():
		user_name = form.user_name.data
		list_id = form.list_id.data

		user = User.query.filter_by(user_name = user_name).first();
		gList = List.query.filter_by(id = list_id).first()

		if user is not None and user.user_name is not g.user.user_name and gList is not None:

			user.shared_lists.append( gList )
			db.session.commit()

			return jsonify({"status": "success"})

		return jsonify({"status": "failed"})
	return jsonify({"status": "failed"})

@app.route('/shared_lists')
@login_required
def SharedLists():
	shared_lists = g.user.shared_lists.all()
	return render_template_with_base_object('shared_lists.html', shared_lists = shared_lists)

@app.route('/create_list', methods=['GET', 'POST'])
@login_required
def CreateList():
	form = ListForm()
	if form.validate_on_submit():
		list_name = form.list_name.data

		create_list = List(list_name = list_name, user_id = g.user.id)
		db.session.add(create_list)
		db.session.commit()

	return render_template_with_base_object('create_list.html', title = 'Create List', form = form)

@app.route('/lists/<list_id>', methods=['GET', 'POST'])
@login_required
def GetList(list_id):
	query_list = g.user.lists.filter_by(id = list_id).first()
	query_list_shared =g.user.shared_lists.filter_by(id = list_id).first()

	if query_list is not None or query_list_shared is not None:
		form = ItemForm()

		return render_template_with_base_object('list.html', 
			title = query_list.list_name if query_list is not None else query_list_shared.list_name, 
			query_list = query_list if query_list is not None else query_list_shared, 
			form = form)

	return redirect(url_for('Index'))

@socketio.on('add item', namespace = '/item')
@login_required
def AddItem(message):
	Before_request()

	# Before checking for validation, we assume the item will not be 
	# added and that the list is not valid.
	sendMessage = {"errors": "This is not a valid list."}
	customMessage = 'add item fail'
	room = None

	list_id = message["list_id"]
	query_list = g.user.lists.filter_by(id = list_id).first()
	query_list_shared = g.user.shared_lists.filter_by(id = list_id).first()

	if query_list is not None or query_list_shared is not None:
		form = ItemForm(item_name = message["item_name"], csrf_token = message["csrf_token"])

		# We don't need the items checked state to validate the form
		del form.check

		if form.validate():
			item_name = form.item_name.data
			item = Item(item_name = item_name, list_id = list_id)

			# add item entry
			db.session.add(item)
			db.session.commit()

			# Set everything to a success state.
			sendMessage = { "itemID": item.id, "itemName": item.item_name }
			customMessage = 'add item success'
			room = list_id

		else:
			sendMessage = { "errors": [form.item_name.errors, form.csrf_token.errors]}

	emit(customMessage, sendMessage, room = room)

@socketio.on('update item', namespace = '/item')
@login_required
def UpdateItem(message):
	Before_request()

	list_id = message["list_id"]
	item_id = message["item_id"]

	# Before checking for validation, we assume the item will not be 
	# added and that the list is not valid.
	sendMessage = {"errors": "This is not a valid list."}
	customMessage = 'update item fail'
	room = None

	query_list = g.user.lists.filter_by(id = list_id).first()
	query_list_shared = g.user.shared_lists.filter_by(id = list_id).first()
	
	if query_list is not None or query_list_shared is not None:

		item = Item.query.filter_by(id = item_id).first()
		form = ItemForm(item_name = message["item_name"], csrf_token = message["csrf_token"])

		# We don't need the items checked state to validate the form
		del form.check

		if item is not None and form.validate():
			item.item_name = form.item_name.data
			db.session.commit()

			sendMessage = {"itemName": item.item_name, "itemID": item.id}
			customMessage = 'update item success'
			room = list_id

		else:
			sendMessage = {"errors": form.item_name.errors}

	emit(customMessage, sendMessage, room = room)

@app.route('/lists/<list_id>/deleteItem/<item_id>', methods=['GET', 'POST'])
@login_required
def DeleteItem(list_id, item_id):
	query_list = g.user.lists.filter_by(id = list_id).first()
	query_list_shared = g.user.shared_lists.filter_by(id = list_id).first()

	if query_list is not None or query_list_shared is not None:
		
		item = Item.query.filter_by(id = item_id).first()
		form = ItemForm()

		# We don't need the item name to validate this request.
		del form.item_name

		# We don't need the items checked state to validate the form
		del form.check
		
		if item is not None and form.validate_on_submit():
			db.session.delete(item)
			db.session.commit()

			return jsonify({"status": "success"})

		return jsonify({"status": "failed", "errors": "Did not delete item."})
	return jsonify({"status": "failed", "errors": "This is not a valid list."})

#@app.route('/lists/<list_id>/checkItem/<item_id>', methods=['GET', 'POST'])
@socketio.on('check item', namespace = '/item')
@login_required
def CheckItem(message):
	Before_request()

	list_id = message["list_id"]
	item_id = message["item_id"]

	query_list = g.user.lists.filter_by(id = list_id).first()
	query_list_shared = g.user.shared_lists.filter_by(id = list_id).first()

	# Before checking for validation, we assume the item will not be 
	# added and that the list is not valid.
	sendMessage = {"errors": "This is not a valid list."}
	customMessage = 'check item fail'
	room = None

	if query_list is not None or query_list_shared:
		
		item = Item.query.filter_by(id = item_id).first();
		check = True if message["check"] else False
		form = ItemForm(check = check, csrf_token = message["csrf_token"])

		# We don't need the item name to validate this request.
		del form.item_name

		if item is not None and form.validate():
			item.check = form.check.data
			db.session.commit()

			sendMessage = { "itemID": item.id }
			customMessage = 'check item success'
			room = list_id

		else:
			sendMessage = { "errors" : item.check.errors }

	emit(customMessage, sendMessage, room = room)

@app.route('/login', methods=['GET', 'POST'])
def Login():

	if g.user is not None and g.user.is_authenticated():
		return redirect(url_for('Index'))

	form = LoginForm()
	if form.validate_on_submit():
		user_name = form.user_name.data
		password = form.password.data

		user = User.query.filter_by(user_name = user_name).first()
		if user is not None and password == user.password:
			login_user(user)
			return redirect(request.args.get("next", url_for("Index")))
		else:
			flash("Invalid username or password")

	return render_template('login.html', title = 'Log In', form = form)

@app.route('/signup', methods=['GET', 'POST'])
def Signup():
	
	if g.user is not None and g.user.is_authenticated():
		return redirect(url_for('Index'))

	form = SignupForm()
	if form.validate_on_submit():
		user_name = form.user_name.data
		password = form.password.data

		user = User(user_name = user_name, password = password)
		db.session.add(user)
		db.session.commit()

		return redirect(url_for('Login'))

	return render_template('signup.html', title = 'Sign Up', form = form)

@app.route('/logout')
def Logout():
	logout_user()
	return redirect(url_for('Login'))

@app.before_request
def Before_request():
	g.user = current_user

#Used for flask-login
@lm.user_loader
def Load_user(id):
	return User.query.get(int(id))

# This function is used to help add basic objects used by a template.
def render_template_with_base_object(filename, **kwargs):
	searchForm = SearchForm()
	kwargs["searchForm"] = searchForm
	return render_template(filename,  **kwargs)