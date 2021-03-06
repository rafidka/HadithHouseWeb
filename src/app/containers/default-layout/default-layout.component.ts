import {Component, OnInit} from '@angular/core';
import {navItems} from '../../_nav';
import {AuthService} from '../../core/auth.service';
import {FacebookService, IFbMeResponse} from '../../services/facebook.service';
import {Router} from '@angular/router';
import {UserApiService} from '../../services/user-api.service';
import {timeout} from 'rxjs/operators';
import {LoadingStatusService} from '../../core/loading-status.service';
import {faSyncAlt} from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-home',
  templateUrl: './default-layout.component.html'
})
export class DefaultLayoutComponent implements OnInit {
  private changes: MutationObserver;
  navItems = navItems;
  sidebarMinimized = true;
  element: HTMLElement = document.body;
  isLoading = false;
  faSyncAlt = faSyncAlt;

  constructor(private facebookService: FacebookService,
              private router: Router,
              private loadingStatusService: LoadingStatusService,
              private userService: UserApiService,
              protected authService: AuthService) {
    this.changes = new MutationObserver((mutations) => {
      this.sidebarMinimized = document.body.classList.contains(
        'sidebar-minimized');
    });

    this.changes.observe(<Element>this.element, {
      attributes: true
    });
  }

  ngOnInit() {
    this.initFbSdk();
    this.loadingStatusService.isLoadingObservable().subscribe(isLoading => {
      this.isLoading = isLoading;
    });
  }

  private initFbSdk() {
    this.facebookService.init().subscribe(() => {
      console.log('FB SDK successfully initialized.');
      this.fbGetLoginStatus();
    }, () => {
      console.error('Failed to load FB SDK. This is most probably due to a ' +
        'plugin in your browser, e.g. AdBlocker or Ghostery, blocking ' +
        'requests to social websites. Disable blocking for this website ' +
        'and try again.');
    });
  }

  private fbSetUser(accessToken: string, userId: string) {
    this.authService.fbAccessToken = accessToken;
    this.authService.fbUserId = userId;
    if (this.authService.fbUserId !== null) {
      this.fetchUserInfo();
    }
    else {
      this.authService.fbUserInfo = null;
    }
  }

  private fbGetLoginStatus() {
    this.facebookService.getLoginStatus().pipe(timeout(5000)).subscribe(
      loginStatus => {
        this.authService.isLoginStatusFetched = true;
        if (loginStatus.status === 'connected') {
          // The user is logged in to Facebook and has authenticated
          // the application.
          this.fbSetUser(loginStatus.authResponse.accessToken,
            loginStatus.authResponse.userID);
        } else if (loginStatus.status === 'not_authorized') {
          // The user is logged in to Facebook, but has not authenticated
          // the application.
          this.fbSetUser(null, null);
        } else {
          // The user isn't logged in to Facebook.
          this.fbSetUser(null, null);
        }
      },
      error => {
        console.error("Couldn't fetch login status.");
        this.authService.isLoginStatusFetched = false;
      });
  }

  fbLogin(): void {
    if (!this.facebookService.isFbSdkLoaded()) {
      toastr.error('Cannot login because Facebook SDK couldn\'t be loaded.' +
        ' This is most probably due to a plugin in your browser, e.g. ' +
        'AdBlocker or Ghostery, blocking requests to social websites. ' +
        'Disable blocking for this website and try again.');
      return;
    }

    this.facebookService.login().subscribe(
      (response) => {
        console.error('User logged in with Facebook.');
        if (response.authResponse) {
          if (response.status === 'connected') {
            this.fbSetUser(response.authResponse.accessToken,
              response.authResponse.userID);
          }
        } else {
          console.log('User cancelled login.');
        }
      },
      (error) => {
        console.error('Failed to login to Facebook. Error: ' + error);
      }
    );
  }

  fbLogout(): void {
    if (!this.facebookService.isFbSdkLoaded()) {
      toastr.error('Cannot login because Facebook SDK couldn\'t be loaded.' +
        ' This is most probably due to a plugin in your browser, e.g. ' +
        'AdBlocker or Ghostery, blocking requests to social websites. ' +
        'Disable blocking for this website and try again.');
      return;
    }

    this.facebookService.logout().subscribe(
      (/*response*/) => {
        console.log('User logged out.');
        this.fbSetUser(null, null);
      });
  }

  /**
   * Called to fetch the user information if a user is logged in.
   */
  private fetchUserInfo(): void {
    this.facebookService.getLoggedInUser().subscribe(
      (user: IFbMeResponse) => {
        if (user === null) {
          this.authService.fbUserInfo = null;
        } else {
          this.authService.fbUserInfo = {
            id: user.id,
            link: user.link,
            profilePicUrl: user.picture.data.url
          };
        }

        this.userService.get('current').subscribe(user => {
          this.authService.user = user;
        });
      },
      (error: any) => {
        console.error('Failed to fetch logged in user. Error: ' +
          JSON.stringify(error));
        this.authService.fbUserInfo = null;
      }
    );
  }

}
