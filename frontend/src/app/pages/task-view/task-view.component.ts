import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { List } from 'src/app/models/list.model';
import { Task } from 'src/app/models/task.model';
import { TaskService } from 'src/app/task.service';

@Component({
  selector: 'app-task-view',
  templateUrl: './task-view.component.html',
  styleUrls: ['./task-view.component.scss']
})
export class TaskViewComponent implements OnInit {

  lists!: List[];
  tasks!: Task[];
  selectedListId!: string;


  constructor(private taskService: TaskService,
              private route: ActivatedRoute,
              private router: Router) { }

  ngOnInit(): void {
    this.route.params.subscribe(
      (params) => {
        if (params['listId'] !== undefined ){
          this.selectedListId = params['listId'];
          this.taskService.getTasks(params['listId']).subscribe((tasks: any) => {
            this.tasks = tasks;
        })}else this.tasks = []})

    this.taskService.getLists().subscribe((lists: any) => {
      this.lists = lists
    })
  }

  createNewList(){
    this.taskService.createList("new title").subscribe(
      (response: any) => { console.log(response)});
  }

  direct(){
    this.route.params.subscribe(
      (params) => {
      params['listId'] !== undefined ? 
      this.router.navigate(['./new-task'], {relativeTo: this.route}) : alert('Please select a list')
    })
  }

  onTaskClick(task: Task){
    this.taskService.complete(task).subscribe(
      (response) => {console.log(response);
      task.completed = !task.completed})
  }

  onDeleteListClick(){
    if (this.selectedListId) {
      this.taskService.deleteList(this.selectedListId).subscribe((res: any) => {
        this.router.navigate(['/lists'])
        console.log(res);
      })
    }else { 
      alert("Please select a list to delete!")
    }
  }

  onDeleteTaskClick(taskId: string){
    this.taskService.deleteTask(this.selectedListId, taskId).subscribe((res: any) => {
      console.log(res);
    })
    this.tasks = this.tasks.filter(t => t._id !== taskId);
    console.log('task deleted successfully')
  }

  onEditTaskClick(taskId: string){
    this.router.navigate(['/lists', this.selectedListId, 'edit-task', taskId])
  }
}
