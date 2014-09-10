from Lister import db

#SharedList Table
SharedLists = db.Table('SharedLists',
	# this is the id of the list being shared.
	db.Column('list_id', db.Integer, db.ForeignKey('list.id')),

	# this is the id of the user who is being shared a list.
	db.Column('user_id', db.Integer, db.ForeignKey('user.id'))
	)

class User(db.Model):
	id = db.Column(db.Integer, primary_key = True)
	user_name = db.Column(db.String(120), index = True, unique = True)
	password = db.Column(db.String(120), index = True)
	lists = db.relationship('List', backref = 'user', lazy = 'dynamic')
	shared_lists = db.relationship('List', secondary = SharedLists, backref = db.backref('users', lazy = 'dynamic'), lazy = 'dynamic')

	def is_authenticated(self):
		return True

	def is_active(self):
		return True

	def is_anonymous(self):
		return False

	def get_id(self):
		return unicode(self.id)

	def __repr__(self):
		return '<User %r>' % (self.user_name)

	def serialize(self):
		return {"user_name": self.user_name}

class List(db.Model):
	id = db.Column(db.Integer, primary_key = True)
	list_name = db.Column(db.String(50), index = True)
	user_id = db.Column(db.Integer, db.ForeignKey('user.id'), index = True)
	items = db.relationship('Item', backref = 'list', lazy = 'dynamic')

	def __repr__(self):
		return '<List %r>' % (self.list_name)

	def serialize(self):
		return{"list_id": self.id, "list_name": self.list_name}

class Item(db.Model):
	id = db.Column(db.Integer, primary_key = True)
	item_name = db.Column(db.String(50), index = True )
	list_id = db.Column(db.Integer, db.ForeignKey('list.id'), index = True)
	check = db.Column(db.Boolean, default = False, index = True)

	def __repr__(self):
		return '<Item %r>' % (self.item_name)