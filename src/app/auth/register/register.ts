import { Component, signal } from '@angular/core';
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
import { RouterLink, Router } from '@angular/router';
import { Auth } from '../../core/services/auth';

function passwordsCoincidenValidator(): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const password = group.get('password')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;

    return password === confirmPassword
      ? null
      : { passwordsNoCoinciden: true };
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
  mensajeExito = signal('');
  mensajeError = signal('');

  constructor(private fb: FormBuilder,
              private auth: Auth,
              private router: Router) {
    this.registerForm = this.fb.group(
      {
        nombreCompleto: ['', [Validators.required]],
        email: ['', [Validators.required, Validators.email]],
        numeroIdentificacion: ['', [Validators.required]],
        numeroTelefonico: ['', [Validators.required]],
        password: ['', [Validators.required, Validators.minLength(8)]],
        confirmPassword: ['', [Validators.required]],
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
      !!this.registerForm.get('confirmPassword')?.touched
    );
  }

  onSubmit(): void {
    this.mensajeExito.set('');
    this.mensajeError.set('');

    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    const request = {
      nombreCompleto: this.registerForm.get('nombreCompleto')?.value,
      email: this.registerForm.get('email')?.value,
      numeroIdentificacion: this.registerForm.get('numeroIdentificacion')?.value,
      numeroTelefonico: this.registerForm.get('numeroTelefonico')?.value,
      password: this.registerForm.get('password')?.value,
      confirmPassword: this.registerForm.get('confirmPassword')?.value,
    };

    this.auth.register(request).subscribe({
      next: () => {
        this.mensajeExito.set('Registro exitoso');
        setTimeout(() => {
          this.router.navigate(['/auth/login']);
        }, 2000);
      },
      error: (error) => {
        console.error('Error en el registro:', error);
        console.error('Mensaje del backend:', error.error);

        this.mensajeError.set(error.error || 'Ocurrio un error durante el registro');
      }
    });
  }
}
