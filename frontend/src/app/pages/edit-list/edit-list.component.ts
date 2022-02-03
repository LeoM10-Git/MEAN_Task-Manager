import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { List } from 'src/app/models/list.model';
import { TaskService } from 'src/app/task.service';

@Component({
  selector: 'app-edit-list',
  templateUrl: './edit-list.component.html',
  styleUrls: ['./edit-list.component.scss']
})
export class EditListComponent implements OnInit {

  constructor(private route: ActivatedRoute, private taskService: TaskService, private router: Router) { }

  listId!: string;
  listToEdit!: string;

  ngOnInit(): void {
    this.route.params.subscribe(
      (params) => {
        this.listId = params['listId'];
    })
    this.taskService.getList(this.listId).subscribe((list: List) => {
      this.listToEdit = list.title || '';
    })
  }

  updateList(title: string){
    this.taskService.updateList(this.listId, title).subscribe(() => {
      this.router.navigate(['/lists', this.listId]);
    })
  }
}
