bkg = chrome.extension.getBackgroundPage(); // Récupération d'une référence vers la backgroundpage

/**
* Fonction principale, exécutée lors du clic sur l'icône CopyAllURLs
*/
jQuery(function($){
	// Bindings actions
	$('#actionCopy').click(function(e){
		Action.copy();
	});
	$('#actionPaste').click(function(e){
		Action.paste();
	});
	$('#actionOption').click(function(e){
		chrome.tabs.create({ url: 'options.html'});
	});
});

/**
* Objet qui gère les actions (clic sur liens de fonctionnalités dans popup.html)
*/
Action = {
	/**
	* Copie les URLs dans le presse papier
	*/
	copy: function(){
		// On récupère le format (par défaut : text)
		format = localStorage['format'] ? localStorage['format'] : 'text';
		outputText = '';
		
		// On récupére la fenêtre courrante
		chrome.windows.getCurrent(function(win) {
			// On récupère tous les onglets de la fenêtre courante
			chrome.tabs.getAllInWindow(win.id, function(tabs) {
				if( format == 'html' ){
					outputText = CopyTo.html(tabs);
				} else if( format == 'custom' ) {
					outputText = CopyTo.custom(tabs);
				} else if( format == 'json' ) {
					outputText = CopyTo.json(tabs);
				} else {
					outputText = CopyTo.text(tabs);
				}
				
				var nombre = (tabs.length > 1) ? 's' : '';
				jQuery('#message').html("<b>"+tabs.length+"</b> url"+nombre+" successfully copied !");
				bkg.Clipboard.write(outputText);
			})
		});
	},
	
	/**
	* Ouvre toutes les URLs du presse papier dans des nouveaux onglets
	*/
	paste: function(){
		// alert( bkg.Clipboard.read() );
		var clipboardString = bkg.Clipboard.read();
		
		// Extraction des URL, soit ligne par ligne, soit intelligent paste
		if( localStorage["intelligent_paste"] == "true" ){
			var urlList = clipboardString.match(/(https?|ftp|ssh|mailto):\/\/[a-z0-9\/:%_+.,#?&=-]+/gi);
		} else {
			var urlList = clipboardString.split("\n");
		}
		
		// Extraction de l'URL pour les lignes au format HTML (<a...>#url</a>)
		$.each(urlList, function(key, val){
			var matches = val.match(new RegExp('<a[^>]+href="([^"]+)"', 'i'));
			try{
				urlList[key] = matches[1];
			} catch(e){}
			
			urlList[key] = jQuery.trim(urlList[key]);
		});
		
		// Suppression des URLs non conformes
		urlList = urlList.filter(function(url){
			if( url == "" || url == undefined ){
				return false;
			}
			// if( !url.match(/[a-z0-9_-]:\/\//i) ){
				// return false;
			// }
			return true;
		});
		
		// Ouverture de toutes les URLs dans des onglets
		bkg.debug_paste = {list: urlList, openned: []};
		$.each(urlList, function(key, val){
			chrome.tabs.create({ url: val}, function(tab){
				bkg.debug_paste.openned.push(tab.url);
			});
		});
	}
}

/**
* Fonctions de copie des URL dans une chaîne de caractères
*/
CopyTo = {
	// Copie les URLs des onglets au format html
	html: function(tabs){
		var anchor = localStorage['anchor'] ? localStorage['anchor'] : 'url';
		var row_anchor = '';
		var s = '';
		for (var i=0; i < tabs.length; i++) {
			row_anchor = tabs[i].url;
			if( anchor == 'title' ){
				try{
					Encoder.EncodeType = "entity";
					row_anchor = Encoder.htmlEncode(tabs[i].title);
				} catch(ex){
					row_anchor = tabs[i].title;
				}
			}
			s += '<a href="'+tabs[i].url+'">'+row_anchor+'</a><br/>';
			s = s + "\n";
		}
		return s;
	},
	
	// Copie les URLs des onglets au format custom
	custom: function(tabs){
		var template = (localStorage['format_custom_advanced'] && localStorage['format_custom_advanced'] != '') ? localStorage['format_custom_advanced'] : null;
		if( template == null ){
			return 'ERROR : Row template is empty ! (see options page)';
		}
		var s = '';
		for (var i=0; i < tabs.length; i++) {
			var current_row   = template;
			var current_url   = tabs[i].url;
			var current_title = tabs[i].title;
			
			// Encodage (html entities) du title
			// try{
				// Encoder.EncodeType = "entity";
				// current_title = Encoder.htmlEncode(current_title);
			// } catch(ex){}
			
			// Injection des variables dans le template
			current_row = current_row.replace(/\$url/gi, current_url);
			current_row = current_row.replace(/\$title/gi, current_title);
			
			s += current_row;
		}
		return s;
	},
	
	// Copie les URLs des onglets au format texte
	text: function(tabs){
		var s = '';
		for (var i=0; i < tabs.length; i++) {
			s += tabs[i].url;
			s = s + "\n";
		}
		return s;
	},
	
	// Copie les URLs des onglets au format JSON
	json: function(tabs){
		var data = [];
		for (var i=0; i < tabs.length; i++) {
			data.push({url: tabs[i].url, title: tabs[i].title});
		}
		return JSON.stringify(data);
	}
}