
Router.route('/boled/',
	function() {
		this.layout('basicLayout');
		this.render('boled');
	});
	
Router.route('/webui',
	function() {
		this.layout('basicLayout');
		this.render('screen');
	});