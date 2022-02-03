import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TaskService } from 'src/app/task.service';
import { Task } from 'src/app/models/task.model'

@Component({
  selector: 'app-new-task',
  templateUrl: './new-task.component.html',
  styleUrls: ['./new-task.component.scss']
})
export class NewTaskComponent implements OnInit {

  constructor(private taskService: TaskService, private route: ActivatedRoute, 
    private router: Router) { }

  listId!: string;

  ngOnInit(): void {
    this.route.params.subscribe(
      (params) => {
      this.listId = params['listId'];
      })
    } 

  createTask(title: string){
    this.taskService.createTask(this.listId, title).subscribe((newTask: Task) => {
      console.log(newTask);
      this.router.navigate(['../'], { relativeTo: this.route});
    })
  }
}
