import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';

function passwordsCoincidenValidator(): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const password = group.get('password')?.value;
    const password2 = group.get('password2')?.value;
    return password === password2 ? null : { passwordsNoCoinciden: true };
  };
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  styleUrl: './register.css',
  templateUrl: './register.html',
})
export class Register {
  registerForm: FormGroup;
  showPassword = false;
  showPassword2 = false;

  constructor(private fb: FormBuilder) {
    this.registerForm = this.fb.group(
      {
        nombre: ['', [Validators.required]],
        email: ['', [Validators.required, Validators.email]],
        identificacion: ['', [Validators.required]],
        telefono: ['', [Validators.required]],
        password: ['', [Validators.required, Validators.minLength(8)]],
        password2: ['', [Validators.required]],
        acepta: [false, [Validators.requiredTrue]],
      },
      { validators: passwordsCoincidenValidator() }
    );
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  togglePassword2Visibility(): void {
    this.showPassword2 = !this.showPassword2;
  }

  get passwordsNoCoinciden(): boolean {
    return (
      this.registerForm.hasError('passwordsNoCoinciden') &&
      !!this.registerForm.get('password2')?.touched
    );
  }

  onSubmit(): void {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }
    // TODO: llamar al AuthService una vez lo creemos
  }
}