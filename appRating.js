/**
 * @author Chris Young
 */
var appRating = {};

(function() {
	appRating.daysUntilPrompt= 5;
	appRating.timeBeforeReminder= 1;
	appRating.usesUntilPrompt= 3;
	appRating.appId = 'Your App ID';

	/*Private */
	var messageTitle= String.format('Rate %@', Ti.App.getName());
	var templateReviewURL= 'itms-apps://ax.itunes.apple.com/WebObjects/MZStore.woa/wa/viewContentsUserReviews?type=Purple+Software&id=%@';
	var rateButton= String.format('Rate %@', Ti.App.getName());
	var ratingMessage= String.format('If you enjoy using %@, would you mind taking a moment to rate it? It won\'t take more than a minute. Thanks for your support!', Ti.App.getName());
	var cancelButton= 'No, Thanks';
	var remindMeLater= 'Remind Me later';

	incrementUseCount = function incrementUseCount () {
		var version = Ti.App.getVersion();

		var trackingVersion = Ti.App.Properties.getString('CurrentVersion');

		if(trackingVersion == null) {
			trackingVersion = version;
			Ti.App.Properties.setString('CurrentVersion', trackingVersion);
		}

		Ti.API.info('Current Tracking Version: ' + trackingVersion);

		if(trackingVersion == version) {
			var timeInterval = Ti.App.Properties.getDouble('FirstUseDate', 0);
			if(timeInterval == 0) {
				timeInterval = new Date().getTime();
				Ti.App.Properties.setDouble('FirstUseDate', timeInterval);
			}

			var useCount = Ti.App.Properties.getInt('UseCount', 0);
			useCount++;
			Ti.App.Properties.setInt('UseCount', useCount);
			Ti.API.info('Use Count: ' + useCount);
		} else {
			//new version
			Ti.App.Properties.setString('CurrentVersion', version);
			Ti.App.Properties.setDouble('FirstUseDate', new Date().getTime());
			Ti.App.Properties.setInt('UseCount', 1);
			Ti.App.Properties.setBool('RatedCurrentVersion', false);
			Ti.App.Properties.setBool('DeclinedToRate', false);
			Ti.App.Properties.setDouble('ReminderRequestDate', 0);
		}
	}
	appRating.ratingConditionsHaveBeenMet = function ratingConditionsHaveBeenMet() {
		var dateOfFirstLaunch = Ti.App.Properties.getDouble('FirstUseDate');
		var timeSinceFirstLaunch = new Date().getTime() - dateOfFirstLaunch;
		var timeUntilRate = 60 * 60 * 24 * appRating.daysUntilPrompt;
		Ti.API.info('First Launch: ' + dateOfFirstLaunch);
		Ti.API.info('Since First Launch: ' + timeSinceFirstLaunch);
		Ti.API.info('Time Until Rate: ' + timeUntilRate);

		if(timeSinceFirstLaunch < timeUntilRate) {
			return false;
		}

		var useCount = Ti.App.Properties.getInt('UseCount');
		Ti.API.info('Used: ' + useCount);
		if(useCount <= appRating.usesUntilPrompt) {
			return false;
		}

		if(Ti.App.Properties.getBool('DeclinedToRate')) {
			return false;
		}

		if(Ti.App.Properties.getBool('RatedCurrentVersion')) {
			return false;
		}

		var reminderRequestDate = Ti.App.Properties.getDouble('ReminderRequestDate');
		var timeSinceReminderRequest = new Date().getTime() - reminderRequestDate;
		var timeUntilReminder = 60 * 60 * 24 * appRating.timeBeforeReminder;

		if(timeSinceReminderRequest < timeUntilReminder) {
			return false;
		}

		return true;
	}
	appRating.incrementAndRate= function incrementAndRate() {
		incrementUseCount();
		if(appRating.ratingConditionsHaveBeenMet()) {
			appRating.showRatingAlert();
		}
	}
	appRating.showRatingAlert = function showRatingAlert() {
		var a = Titanium.UI.createAlertDialog({
			title: messageTitle,
			message: ratingMessage,
			buttonNames: [rateButton, remindMeLater, cancelButton],
			cancelButton: 2
		});

		a.addEventListener('click', function(e) {
			switch(e.index) {
				case 0:
					Ti.API.info('Rate ' + Ti.Platform.model);
					if(Ti.Platform.model == 'simulator') {
						Ti.API.info('Launching rating url');
					} else {
						var reviewUrl = String.format(templateReviewURL, appRating.appId);
						Ti.App.Properties.setBool('RatedCurrentVersion', true);
						Ti.API.info('Launching rating url: ' + reviewUrl);
						Ti.Platform.openURL(reviewUrl);
					}
					break;
				case 1:
					Ti.API.info('Later');
					Ti.App.Properties.setDouble('ReminderRequestDate', new Date().getTime());
					break;
				case 2:
					Ti.API.info('Declined to rate');
					Ti.App.Properties.setBool('DeclinedToRate', true);
					break;
				default:
					break;
			}
		});
		a.show();
	}
})();
(function() {
	appRating.incrementAndRate();
	if (isiOS4Plus()) {
		// fired when an app resumes for suspension
		Ti.App.addEventListener('resume', function(e) {
			appRating.incrementAndRate();
		});
		Ti.App.addEventListener('resumed', function(e) {
			appRating.incrementAndRate();
		});
	}

})();
function isiOS4Plus() {
	// add iphone specific tests
	if (Titanium.Platform.name == 'iPhone OS') {
		var version = Titanium.Platform.version.split(".");
		var major = parseInt(version[0]);

		// can only test this support on a 3.2+ device
		if (major >= 4) {
			return true;
		}
	}
	return false;
}