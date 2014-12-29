EWD.sockets.log = true;
EWD.application = {
	ready: false,
	name: 'geodemo',
	pos: {},
	route: "",
	incidents: [],
	onMessage: {
		saveTimeSlot: function(messageObj) {
			$.mobile.loading( "hide" );
			$(':mobile-pagecontainer').pagecontainer('change', '#List', {
				changeHash: true,
				reverse: true,
				showLoadMsg: true
			});
		},
		getPSCList: function(messageObj) {
		 },
		 buildPSCList: function(messageObj) {
			$("#update-time").text(messageObj.list.updated);
			EWD.application.incidents = messageObj.list.incidents;
			$('#list-results').empty();
			 var color,icon = "dgx2.png"
			 EWD.application.timeSlots = [];
			 $.each(messageObj.list.psc, function( index, data ) {
				switch(data.WaitStatus) {
					case "1":
						color = "green";
						icon = "dgx-icon-good2.png"
						break;
					case "3":
						color = "red";
						icon = "dgx-icon-alert2.png"
						break;
					default:
						color = "";
						icon = "dgx-icon-warn2.png"
				};
				$clone = $("#list-copy li").first().clone();
				$clone.attr('data-longlat',data.Location.LongLat);
				$clone.find(".site-name").text(data.SiteName);
				$clone.find(".reserve").click( function (event) {
					event.stopImmediatePropagation();
					var group,control;
					if ( $('#radio-group .ui-controlgroup-controls').length>0 ) {
						group = $('#radio-group .ui-controlgroup-controls');
						control = true;
					} else {
						group = $('#radio-group');
						control = false
					}
					group.empty();
					$('.reserve-header').text( $(this).attr("psc") );
					$.each(	EWD.application.timeSlots[$(this).attr("index")], function( index, value ) {
						group.append('<label><input type="radio" name="times" value="' + value + '" id="time' + index + '" />' + value + '</label>');
					});
					$(':mobile-pagecontainer').pagecontainer('change', '#Reserve', {
						changeHash: false,
						reverse: true,
						showLoadMsg: true
					});
					return false;
				}).attr("index",index);
				$clone.find(".hours").text(data.Hours);
				$clone.find(".address").text(
						data.Location.Address+", "
						+data.Location.City+", "
						+data.Location.State+" "
						+data.Location.PostCode);
				$clone.find(".wait-time").text(data.WaitTime).css({"color":color}).attr("status",data.WaitStatus);
				if (data.SlotReserved) {
					$clone.find(".slot-reserved").text("Time Slot Reserved: " + data.SlotReserved).show();
				}
				if ( data.TimeSlots ) {
					var rmsg = (!data.SlotReserved) ? "Reserve" : "Change";
					$clone.find(".reserve").attr("psc",data.SiteName).text(rmsg + " Time Slot ["+data.TimeSlots.length+"]").show();
					EWD.application.timeSlots[index] = data.TimeSlots;
				} 
				$clone.find(".distance").text(data.Distance);
				$clone.appendTo("#list-results").click( function () {
					EWD.application.route = $(this).attr("data-longlat");
				});
			 });
			 $("#list-results").listview( "refresh" ).trigger( "updatelayout" );
			 $.mobile.loading( "hide" );
		}
	},
	UpdatePSCList : function() {
		$.mobile.loading( "show", {
			text: "Retrieving PSC List...",
			textVisible: true,
		});
		$('#list-results li').remove();
		EWD.sockets.sendMessage({
			type: "getPSCList",
			params: {
				date: new Date().toUTCString(),
				position: EWD.application.pos
			}
		});
		return true;
	},
    DrawMap : function(latlng) {
		var height = $(window).height() - 70;
        var width = $(window).width();
        $("#map-canvas").height(height);
        $("#map-canvas").width(width);
		
		var myOptions = {
            zoom: 11,
            center: latlng,
            mapTypeId: google.maps.MapTypeId.ROADMAP,
        };
        var map = new google.maps.Map(document.getElementById("map-canvas"), myOptions);
		//traffic
		if ( $("#traffic-flow").val() == "on" ) {
			var trafficLayer = new google.maps.TrafficLayer();
			trafficLayer.setMap(map);
		}

		//person's position
        var marker = new google.maps.Marker({
            position: latlng,
            map: map,
			icon: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png',
            title: "You"
        });
		//lab positions
		$( "#list-results li" ).each(function( index ) {
			var color,icon;
			switch( $(this).find(".wait-time").attr("status") ) {
				case "1":
					color = "green";
					icon = "dgx-icon-good2.png"
					break;
				case "3":
					color = "red";
					icon = "dgx-icon-alert2.png"
					break;
				default:
					color = "";
					icon = "dgx-icon-warn2.png"
			};
			console.log( index + ": " + $( this ).find(".site-name").text() + " : " + $( this ).attr("data-longlat") );
			var latlng = $(this).attr('data-longlat').split(",");
			var labLatLng = new google.maps.LatLng(latlng[0], latlng[1]);
			var $info = "<div class='map-info' style='height:75px;'>"+$( this ).find(".site-name").text()+"<br>"+$( this ).find(".distance").text()+"<br>"+$( this ).find(".wait-time").html()+"</div>";
			var infowindow = new google.maps.InfoWindow({
				content: $info,
				'maxWidth':'300px'
			});
			var marker = new google.maps.Marker({
				position: labLatLng,
				map: map,
				icon: icon,
				title: $( this ).find(".site-name").text(),
				zIndex: index
			});
			google.maps.event.addListener(marker, 'mouseover', function() {
				infowindow.open(map,marker);
			});
			google.maps.event.addListener(marker, 'mouseout', function() {
				infowindow.close();
			});
		});
		//incidents
		if ( $("#traffic-incidents").val() == "on" ) {
			$( EWD.application.incidents ).each(function( index, value ) {
				var icon = this.icon,
					lat = this.lat,
					lng = this.lng,
					desc = this.desc;
				console.log( index + ": " + desc + " : " + lat+","+lng );
				
				var labLatLng = new google.maps.LatLng(lat, lng);
				var $info = "<div class='map-info' style='height:75px;'>"+desc+"<br>"+"</div>";
				var infowindow = new google.maps.InfoWindow({
					content: $info,
					'maxWidth':'300px'
				});
				var marker = new google.maps.Marker({
					position: labLatLng,
					map: map,
					icon: icon,
					title: "Incident",
					zIndex: index
				});
				google.maps.event.addListener(marker, 'mouseover', function() {
					infowindow.open(map,marker);
				});
				google.maps.event.addListener(marker, 'mouseout', function() {
					infowindow.close();
				});
			});
		}
		setTimeout(function() {
            google.maps.event.trigger(map,'resize');
        }, 500);
	},
	displayRoute : function () {
		var height = $(window).height() - 50;
        var width = $(window).width();
        $("#route-canvas").height(height);
        $("#route-canvas").width(width);
		var directionsService = new google.maps.DirectionsService();
		var labPos = EWD.application.route.split(",");
		var start = new google.maps.LatLng(EWD.application.pos.latitude, EWD.application.pos.longitude);
		var end = new google.maps.LatLng(labPos[0], labPos[1]);
		var mapOptions = {
			zoom: 11,
			center: start,
			mapTypeId: google.maps.MapTypeId.ROADMAP
		};

		var map = new google.maps.Map(document.getElementById("route-canvas"), mapOptions);
				
		var directionsDisplay = new google.maps.DirectionsRenderer();
		directionsDisplay.setMap(map);

		var request = {
			origin : start,
			destination : end,
			travelMode : google.maps.TravelMode.DRIVING
		};
		directionsService.route(request, function(response, status) {
			if (status == google.maps.DirectionsStatus.OK) {
				directionsDisplay.setDirections(response);
			}
		});
		
		//traffic
		if ( $("#traffic-flow").val() == "on" ) {
			var trafficLayer = new google.maps.TrafficLayer();
			trafficLayer.setMap(map);
		}
		//incidents
		if ( $("#traffic-incidents").val() == "on" ) {
			$( EWD.application.incidents ).each(function( index, value ) {
				var icon = this.icon,
					lat = this.lat,
					lng = this.lng,
					desc = this.desc;
				console.log( index + ": " + desc + " : " + lat+","+lng );
				
				var labLatLng = new google.maps.LatLng(lat, lng);
				var $info = "<div class='map-info' style='height:75px;'>"+desc+"<br>"+"</div>";
				var infowindow = new google.maps.InfoWindow({
					content: $info,
					'maxWidth':'300px'
				});
				var marker = new google.maps.Marker({
					position: labLatLng,
					map: map,
					icon: icon,
					title: "Incident",
					zIndex: index
				});
				google.maps.event.addListener(marker, 'mouseover', function() {
					infowindow.open(map,marker);
				});
				google.maps.event.addListener(marker, 'mouseout', function() {
					infowindow.close();
				});
			});
		}
		setTimeout(function() {
            google.maps.event.trigger(map,'resize');
        }, 500);
	}
};
navigator.geolocation.getCurrentPosition(
	function (pos) {
	  var crd = pos.coords;
	  console.log('Your current position is:');
	  console.log('Latitude : ' + crd.latitude);
	  console.log('Longitude: ' + crd.longitude);
	  console.log('More or less ' + crd.accuracy + ' meters.');
	  EWD.application.pos.latitude = crd.latitude;
	  EWD.application.pos.longitude = crd.longitude;
	},
	function errora(err) {
	  console.warn('ERROR(' + err.code + '): ' + err.message);
	},
	{maximumAge: 500000, enableHighAccuracy:true, timeout: 6000}
);

$(function() {
	$( "body>[data-role='panel']" ).panel();
	$( "#traffic-settings > [data-role='flipswitch']" ).flipswitch({create: function( event, ui ) {} });
	$( "[data-role='navbar']" ).navbar();
	$( "[data-role='header'], [data-role='footer']" ).toolbar();
	$("#reserveSave").click(function(){
		$(".reserve-error").hide().trigger( "updatelayout" );
		var psc = $(".reserve-header").text(),
			lname = $("#LastName").val(),
			fname = $("#FirstName").val(),
			tslot = $('input[name=times]:checked').val(),
			error = "";
		if ( lname == "" ) error = "Last Name,";
		if ( fname == "" ) error += "First Name,";
		if ( tslot == "" ) error += "Time Slot,";
		if ( error !== "" ) {
			error += " Required!"
			$(".reserve-error").text(error).show().trigger( "updatelayout" );
			return false;
		}
		$.mobile.loading( "show", {
            text: "Reserving Time Slot...",
            textVisible: true,
    	});
		EWD.sockets.sendMessage({
		type: "reserveTimeSlot",
			params: {
				date: new Date().toUTCString(),
				psc: psc,
				lastname: lname,
				firstname: fname,
				timeslot: tslot,
			}
		});
	});
});

$( document ).on( "pagecontainerchange", function() {
	var page = $( ".ui-page-active" ).attr('id');
	//$( "[data-role='header'] h1" ).text(  $( ".ui-page-active" ).jqmData( "title" )+" "+page);
	$( "[data-role='navbar'] a.ui-btn-active" ).removeClass( "ui-btn-active" );
	$( "[data-role='navbar'] a" ).each(function() {
		if ( $( this ).text() === $( ".ui-page-active" ).attr('id') ) {
			$( this ).addClass( "ui-btn-active" );
		}
	});
	if ( page == "List") {
		if ( EWD.application.ready ) {
			EWD.application.UpdatePSCList();
		}
	}
	if ( page == "Map") {
	    var defaultLatLng = new google.maps.LatLng(EWD.application.pos.latitude, EWD.application.pos.latitude);
	    if ( navigator.geolocation ) {
	        function success(pos) {
	            // Location found, show map with these coordinates
				EWD.application.pos.latitude = pos.coords.latitude;
				EWD.application.pos.longitude = pos.coords.longitude;
	            EWD.application.DrawMap(new google.maps.LatLng(pos.coords.latitude, pos.coords.longitude));
	        }
	        function fail(error) {
	            EWD.application.DrawMap(defaultLatLng);  // Failed to find location, show default map
	        }
	        // Find the users current position.  Cache the location for 5 minutes, timeout after 6 seconds
	        navigator.geolocation.getCurrentPosition(success, fail, {maximumAge: 500000, enableHighAccuracy:true, timeout: 6000});
	    } else {
	        EWD.application.DrawMap(defaultLatLng);  // No geolocation support, show default map
	    }
	}
	if ( page == "Route") {
		EWD.application.displayRoute();
	}
	if ( page == "Reserve") {
		$("#radio-group").enhanceWithin().controlgroup("refresh");
	}
});

EWD.onSocketsReady = function() {
	setTimeout(function() {
		var foo = EWD.application.UpdatePSCList();
	}, 1000);
	EWD.application.ready = true;
};

$( document ).on( "pagecreate", "#List", function() {
});

