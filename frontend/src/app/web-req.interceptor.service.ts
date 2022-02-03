import { HttpErrorResponse, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, EMPTY, Observable, pipe, Subject, switchMap, tap, throwError } from 'rxjs';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class WebReqInterceptor implements HttpInterceptor {

  constructor(private authService: AuthService) { }

  refreshingAccessToken: boolean = false;
  accessTokenRefreshed: Subject<any> = new Subject();

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Handler the request
    req = this.addAuthHeader(req);
    return next.handle(req)
    .pipe(
      catchError((error: HttpErrorResponse) => { 
        console.log(error);
        if (error.status === 401 && !this.refreshingAccessToken){
          // 401 error, not authorized
          // refresh the access token
          return this.refreshAccessToken()
          .pipe(
            switchMap(() => {
              req = this.addAuthHeader(req);
              return next.handle(req);
            }),
            catchError((error: any) => {
              console.log(error)
              this.authService.logout();
              return EMPTY;
            }))
        }
        return throwError(() => new Error('error'));
      }
    ))
  }

  refreshAccessToken(){
    // call a method in the auth service to send a request to refresh the access token
    this.refreshingAccessToken = true;
    return this.authService.getNewAccessToken()
    .pipe(
      tap(() => {
        console.log('Access token refreshed');
      })
    )}


  addAuthHeader(req: HttpRequest<any>){
    //get access token
    const accessToken = this.authService.getAccessToken();
    // append the access token to the request header
    if (accessToken){ 
      return req.clone({setHeaders:{'x-access-token': accessToken}});
    }
    return req;
  }




}
