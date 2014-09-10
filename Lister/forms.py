from flask.ext.wtf import Form
from wtforms import TextField, PasswordField, BooleanField, IntegerField
from wtforms.validators import Required, Email, EqualTo

class LoginForm(Form):
	user_name = TextField('user_name', validators = [Required(), Email(message=u'Invalid email address')])
	#Not an encrypted password
	password = PasswordField('password', validators = [Required()])

class SignupForm(Form):
	user_name = TextField('user_name', validators = [Required(), Email(message=u'Invalid email address')])
	password = PasswordField('password', validators = [Required(), EqualTo('confirm_password', message='Passwords must match')])
	confirm_password = PasswordField('confirm_password', validators = [Required()])

class ListForm(Form):
	list_name = TextField('list_name', validators = [Required()])

class ItemForm(Form):
	item_name = TextField('item_name', validators = [Required()])
	check = BooleanField('check')

class SearchForm(Form):
	user_name = TextField('user_name', validators = [Required()])

class ShareListForm(Form):
	user_name = TextField('user_name', validators = [Required()])
	list_id = IntegerField('list_id', validators = [Required()])