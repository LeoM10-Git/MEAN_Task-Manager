import { Injectable } from '@angular/core';
import { WebRequestService } from './web-request.service';
import { Task } from 'src/app/models/task.model'

@Injectable({
  providedIn: 'root'
})
export class TaskService {

  constructor(private webRequestService: WebRequestService) { }

  
  getLists(){ 
    return this.webRequestService.get('lists')
  }
  
  getList(listId: string){ 
    return this.webRequestService.get(`lists/${listId}`)
  }

  getTasks(listId: string){ 
    return this.webRequestService.get(`lists/${listId}/tasks`)
  }

  getTask(listId: string, taskId: string){ 
    return this.webRequestService.get(`lists/${listId}/tasks/${taskId}`)
  }

  createList(title: string){
    // send a web request to create a list
    return this.webRequestService.post('lists', { title })
  }

  updateList(listId: string, title: string){
    // send a web request to update a list
    return this.webRequestService.patch(`lists/${listId}`, { title })
  }

  deleteList(listId: string){ 
    return this.webRequestService.delete(`lists/${listId}`)
  }
  
  createTask(listId: string, title: string){ 
    return this.webRequestService.post(`lists/${listId}/tasks`, { title })
  }
  
  deleteTask(listId: string, taskId: string){ 
    return this.webRequestService.delete(`lists/${listId}/tasks/${taskId}`)
  }

  updateTask(listId: string, taskId: string, title: string){
    // send a web request to update a list
    return this.webRequestService.patch(`lists/${listId}/tasks/${taskId}`, { title })
  }
  
  complete(task: Task){
    return this.webRequestService.patch(`lists/${task._listId}/tasks/${task._id}`, 
    { completed: !task.completed })
  }
}
