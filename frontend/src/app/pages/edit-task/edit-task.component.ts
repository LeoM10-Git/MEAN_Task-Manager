import { Component, OnInit } from '@angular/core';
import { Task } from 'src/app/models/task.model';
import { TaskService } from 'src/app/task.service';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-edit-task',
  templateUrl: './edit-task.component.html',
  styleUrls: ['./edit-task.component.scss']
})
export class EditTaskComponent implements OnInit {

  constructor(private route: ActivatedRoute, private taskService: TaskService, private router: Router) { }

  taskId!: string;
  listId!: string;
  taskToEdit!: string;

  ngOnInit(): void {
    this.route.params.subscribe(
      (params) => {
        this.listId = params['listId'];
        this.taskId = params['taskId'];
    })
    this.taskService.getTask(this.listId, this.taskId).subscribe((task: Task) => {
      this.taskToEdit = task.title || '';
    })
  }

  updateTask(title: string){
    this.taskService.updateTask(this.listId, this.taskId, title).subscribe(() => {
      this.router.navigate(['/lists', this.listId]);
    })
  }
}
