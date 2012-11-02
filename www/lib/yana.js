    var currentItems = [];
    var favorites = [];

    $(document).ready(function () {
    
      // initialize favorites
      if (amplify.store("YANA.favorites")) favorites = amplify.store("YANA.favorites");

      // --------------------------------------------------------------------------
      // --------------------------- SEARCH ---------------------------------------
      // --------------------------------------------------------------------------
       $('#osForm').submit(function(event) {
        var osUrl = this.action+'?'+$(this).serialize();
        var yqlUrl = "http://query.yahooapis.com/v1/public/yql?q=select%20*%20from%20xml%20where%20url%3D%22" + 
          encodeURIComponent(osUrl) + "%22&format=json";
        var ul = '';
          $.ajax({
              type: "GET",
              url: yqlUrl,
              contentType: "application/json; charset=utf-8",
              dataType: "jsonp",
              beforeSend: function() { $.mobile.showPageLoadingMsg(); },
              success: function(data) {
                  var result = JSON.stringify(data);   
                  if(JSON.parse(result).query.results && JSON.parse(result).query.results.rss) {
                    currentItems = JSON.parse(result).query.results.rss.channel.item;
                    $.each(JSON.parse(result).query.results.rss.channel.item, function(index) {
                      ul += '<li id="result_'+index+'" data-source="'+this.link+
                        '" class="html articleDetails" data-theme="c" data-item-index="'+index+'">'+
                        '<a href="#articleDetails">'+this.title+'</a></li>';
                    }); 
                  }
              },
              error: function(request, textStatus, errorThrown) { },
              complete: function(request, textStatus){
                $('#searchResults').listview();
                $('#searchResults').html(ul).trigger('create');
                $('#searchResults').listview('refresh');
                $.mobile.hidePageLoadingMsg()
              }        
          });
      return false;
      }); // opensearch form submit
    }); // document.ready

      // --------------------------------------------------------------------------
      // --------------------------- JQM HACKS ------------------------------------
      // --------------------------------------------------------------------------
      // hack to add the back and home button to all nested listviews
      $(':jqmData(url^=home)').live('pagebeforecreate', 
        function(event) {
          $(this).filter(':jqmData(url*=ui-page)').find(':jqmData(role=header)')
            .prepend('<a href="#" data-rel="back" data-icon="arrow-l">Back</a>')
          $(this).filter(':jqmData(url*=ui-page)').find(':jqmData(role=header)')
            .append('<a href="#home" data-icon="home">Home</a>')
      });

      // --------------------------------------------------------------------------
      // --------------------------- CHILD BROWSER --------------------------------
      // --------------------------------------------------------------------------
      function showInChildBrowser(url){  
        if (window.plugins && (window.plugins.childBrowser != null) ) {
          Cordova.exec("ChildBrowserCommand.showWebPage", url);
          return false;
        } else {
          return true;
        }  
      }

      // --------------------------------------------------------------------------
      // --------------------------- FAVORITES ------------------------------------
      // --------------------------------------------------------------------------
      function hasFavorite(link) {
          for (var i=0;i<favorites.length;i++) {
            if (favorites[i]['link'] === link ) return i;
          }
          return -1;
      }

      $('.addFavoriteButton').live('click',
        function() {   
          var index = $(this).attr('data-item-index');
          var item = currentItems[index];
          if (hasFavorite(item.link) == -1){
            favorites.push(item);
            amplify.store("YANA.favorites",favorites);
          }
      });

      $('.deleteFavoriteButton').live('click',
        function() {   
          var index = $(this).attr('data-item-index');
          var item = currentItems[index];
          var pos = hasFavorite(item.link);
          if ( pos != -1) { 
            favorites.splice(pos, 1);
            amplify.store("YANA.favorites",favorites);
          }
      });

      $('.favorites').live('click',
        function() {
          var ul = '';
          $.each(favorites, function(index) {
           ul += '<li class="articleDetails" data-item-index="'+index+'" data-theme="c">' +
            '<a href="#articleDetails">'+this.title+'</a></li>';
          });
          currentItems = favorites;
          $('#favorites_rss').listview();
          $('#favorites_rss').html(ul).trigger('create');
          $('#favorites_rss').listview('refresh');
          $.mobile.hidePageLoadingMsg();
        });
 
      // --------------------------------------------------------------------------
      // --------------------------- ITEM VIEW ------------------------------------
      // --------------------------------------------------------------------------
      $('.articleDetails').live('click',
        function() {  
          var itemIndex = $(this).attr('data-item-index');
          $("#articleContent").html(currentItems[itemIndex].description);
          $("#articleTitle").html(currentItems[itemIndex].title);
          var buttons = '';
          if (currentItems[itemIndex].enclosure) {
            buttons += '<a onclick="return showInChildBrowser(\'' + currentItems[itemIndex].enclosure.url + '\');" '+
              'rel="external" href="'+currentItems[itemIndex].enclosure.url+'" data-role="button">PDF</a>';
          }
          if (currentItems[itemIndex].link) {
            buttons += '<a onclick="return showInChildBrowser(\'' + currentItems[itemIndex].link + '\');" '+
              'rel="external" href="'+currentItems[itemIndex].link+'" data-role="button">Web</a>';
          }
          if (hasFavorite(currentItems[itemIndex].link) != -1) {
            buttons += '<a href="#" data-item-index="'+itemIndex+
              '" class="deleteFavoriteButton" data-role="button">Remove from Favorites</a>';
          } else {
            buttons += '<a href="#" data-item-index="'+itemIndex+
              '" class="addFavoriteButton" data-role="button">Add to Favorites</a>';            
          }
          var controlGroup = '<div data-role="controlgroup" id="articleFooterButtons" data-type="horizontal">'+
            buttons+'</div>';
          $("#articleFooter").html(controlGroup).trigger('create');
      });

      // --------------------------------------------------------------------------
      // --------------------------- HTML ITEM ------------------------------------
      // --------------------------------------------------------------------------
      $('.html').live('click',
        function() { 
          var htmlId = $(this).attr('id')+'_html'; 
          var title = $(this).find('a').text();
           var url = $(this).attr("data-source");
          var yqlUrl  = "http://query.yahooapis.com/v1/public/yql?q=select%20*%20from%20html%20where%20url%3D%22"+
            encodeURIComponent(url) + "%22";
          var html = '';
          $.ajax({
              type: "GET",
              url: yqlUrl,
              contentType: "application/json; charset=utf-8",
              dataType: "jsonp",
              beforeSend: function() { $.mobile.showPageLoadingMsg(); },
              success: function(data) { if (data.results[0]) { html = data.results[0]; } },
              error: function(request, textStatus, errorThrown) { console.log("error: "+errorThrown); },
              complete: function(request, textStatus){
                $("#htmlContent").html(html);
                $("#htmlTitle").html(title);
                $.mobile.hidePageLoadingMsg()
              }
          }); 
      });

      // --------------------------------------------------------------------------
      // --------------------------- RSS MENU ITEM --------------------------------
      // --------------------------------------------------------------------------
      $('.rss').live('click',
        function() {   
          var url = $(this).attr("data-source");
          var rssId = $(this).attr('id')+'_rss';
          var yqlUrl = "http://query.yahooapis.com/v1/public/yql?q=select%20*%20from%20xml%20where%20url%3D%22" + 
              encodeURIComponent(url) + 
              "%22%20or%20url%20in%20(select%20link%20from%20feed%20where%20url%3D%22" + encodeURIComponent(url) +
              "%22)&format=json";
          var ul = '';
          var listCount = 0;
          $.ajax({
              type: "GET",
              url: yqlUrl,
              contentType: "application/json; charset=utf-8",
              dataType: "jsonp",
              beforeSend: function() { $.mobile.showPageLoadingMsg(); },
              success: function(data) {
                  var result = JSON.stringify(data);                  
                  if(JSON.parse(result).query.results && JSON.parse(result).query.results.rss) {

                      if (JSON.parse(result).query.results.html) {
                        // [1] all rss items are html
                        if (JSON.parse(result).query.results.html.length == JSON.parse(result).query.results.rss.channel.item.length) {
                          currentItems = JSON.parse(result).query.results.rss.channel.item;
                          $.each(JSON.parse(result).query.results.rss.channel.item, function(index) {
                            var sublistId = rssId + '_' + listCount++;
                            ul += '<li id="'+sublistId+'" class="html articleDetails" data-theme="c" data-item-index="'+index+'">'+
                              '<a href="#articleDetails">'+this.title+' </a>';
                          });
                        // [2] some rss items aren't html
                        } else {
                          // TODO: unhandled right now
                        }
                        // [3] all rss items point to other rss feeds
                      } else {
                          $.each(JSON.parse(result).query.results.rss[0].channel.item, function() {
                            var sublistId = rssId + '_' + listCount++;
                            ul += '<li id="'+sublistId+'" data-source="'+this.link+'" class="rss" data-theme="c"><a href="#">'+this.title+'</a>'+
                              '<ul data-role="listview" data-inset="true" id="'+sublistId+'_rss"></ul></li>'; 
                          }); 
                      }
                  }                    
              },
              error: function(request, textStatus, errorThrown) { },
              complete: function(request, textStatus){
                $('#'+rssId).listview();
                $('#'+rssId).html(ul).trigger('create');
                $('#'+rssId).listview('refresh');
                $.mobile.hidePageLoadingMsg()
              }
          });
        }); //onclick