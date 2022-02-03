import { HttpClient, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { shareReplay, tap} from 'rxjs';
import { WebRequestService } from './web-request.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  constructor(private webRequestService: WebRequestService, 
    private router: Router,
    private http: HttpClient) { }

    login(email: string, password: string){
      return this.webRequestService.login(email, password)
      .pipe(
        shareReplay(),
        tap((response: HttpResponse<any>) => { 
          // the auth tokens will be in the header of this response
          this.setSession(response.body._id, response.headers.get('x-access-token')||'', response.headers.get('x-refresh-token')||'');
        })
      )
    }

    signup(email: string, password: string){
      return this.webRequestService.signup(email, password)
      .pipe(
        shareReplay(),
        tap((response: HttpResponse<any>) => { 
          // the auth tokens will be in the header of this response
          this.setSession(response.body._id, response.headers.get('x-access-token')||'', response.headers.get('x-refresh-token')||'');
          console.log("Successfully signed up and logged in")
        })
      )
    }

    logout() {
      this.removeSession();
      this.router.navigate(['/login']);
      // this.router.navigateByUrl('/login');
    }

    getAccessToken(){

      return localStorage.getItem('x-access-token');
    }

    setAccessToken(accessToken: string){ 
      localStorage.setItem('x-access-token',accessToken)
    }

    getRefreshToken(){
      return localStorage.getItem('x-refresh-token');
    }

    getUserId(){
      return localStorage.getItem('userId');
    }

    getNewAccessToken(){
        return this.http.get(`${this.webRequestService.ROOT_URL}/users/me/access-token`,{
          headers: {
            'x-refresh-token': this.getRefreshToken() || [],
            '_id': this.getUserId() || []
          },
          observe: 'response'
        }).pipe(
          tap((res: HttpResponse<any>) => {
            this.setAccessToken(res.headers.get('x-access-token') || '')
          })
        )
      }



    private setSession( userId: string, accessToken: string, refreshToken: string){
      localStorage.setItem('userId', userId);
      localStorage.setItem('x-access-token', accessToken);
      localStorage.setItem('x-refresh-token',refreshToken);
    }

    private removeSession( ){
      localStorage.removeItem('userId');
      localStorage.removeItem('x-access-token');
      localStorage.removeItem('x-refresh-token');
    }
}
