import { Routes } from '@angular/router';
import { adminGuard, authGuard, guestGuard } from './core/guards';
import { homeResolver, productResolver, shopResolver } from './core/resolvers';
import { ShellComponent } from './layout/shell.component';

export const routes: Routes = [
  {
    path: '',
    component: ShellComponent,
    children: [
      { path: '', loadComponent: () => import('./pages/home.component').then((m) => m.HomeComponent), resolve: { home: homeResolver }, title: 'ChooseUrLook' },
      {
        path: 'shop',
        loadComponent: () => import('./pages/shop.component').then((m) => m.ShopComponent),
        resolve: { listing: shopResolver },
        runGuardsAndResolvers: 'paramsOrQueryParamsChange',
        title: 'Shop',
      },
      {
        path: 'c/:slug',
        loadComponent: () => import('./pages/shop.component').then((m) => m.ShopComponent),
        resolve: { listing: shopResolver },
        runGuardsAndResolvers: 'paramsOrQueryParamsChange',
        title: 'Category',
      },
      {
        path: 'p/:slug',
        loadComponent: () => import('./pages/product.component').then((m) => m.ProductComponent),
        resolve: { product: productResolver },
      },
      { path: 'search', redirectTo: 'shop', pathMatch: 'full' },
      { path: 'cart', loadComponent: () => import('./pages/cart.component').then((m) => m.CartComponent), title: 'Bag' },
      { path: 'wishlist', loadComponent: () => import('./pages/wishlist.component').then((m) => m.WishlistComponent), title: 'Wishlist' },
      { path: 'checkout', loadComponent: () => import('./pages/checkout.component').then((m) => m.CheckoutComponent), canActivate: [authGuard], title: 'Checkout' },
      { path: 'auth/login', loadComponent: () => import('./pages/auth.component').then((m) => m.AuthComponent), canActivate: [guestGuard], data: { mode: 'login' }, title: 'Sign in' },
      { path: 'auth/register', loadComponent: () => import('./pages/auth.component').then((m) => m.AuthComponent), canActivate: [guestGuard], data: { mode: 'register' }, title: 'Create account' },
      { path: 'auth/forgot', loadComponent: () => import('./pages/auth.component').then((m) => m.AuthComponent), canActivate: [guestGuard], data: { mode: 'forgot' }, title: 'Reset password' },
      { path: 'auth/reset', loadComponent: () => import('./pages/auth.component').then((m) => m.AuthComponent), data: { mode: 'reset' }, title: 'New password' },
      {
        path: 'account',
        loadComponent: () => import('./pages/account.pages').then((m) => m.AccountShellComponent),
        canActivate: [authGuard],
        children: [
          { path: '', loadComponent: () => import('./pages/account.pages').then((m) => m.ProfileComponent), title: 'Profile' },
          { path: 'orders', loadComponent: () => import('./pages/account.pages').then((m) => m.OrderListComponent), title: 'Orders' },
          { path: 'orders/:id', loadComponent: () => import('./pages/account.pages').then((m) => m.OrderDetailComponent), title: 'Order' },
          { path: 'addresses', loadComponent: () => import('./pages/account.pages').then((m) => m.AddressesComponent), title: 'Addresses' },
        ],
      },
      {
        path: 'admin',
        loadComponent: () => import('./pages/admin.pages').then((m) => m.AdminShellComponent),
        canActivate: [adminGuard],
        children: [
          { path: '', loadComponent: () => import('./pages/admin.pages').then((m) => m.AdminDashboardComponent), title: 'Admin' },
          { path: 'products', loadComponent: () => import('./pages/admin.pages').then((m) => m.AdminProductsComponent), title: 'Products' },
          { path: 'products/new', loadComponent: () => import('./pages/product-form.component').then((m) => m.ProductFormComponent), title: 'New product' },
          { path: 'products/:id', loadComponent: () => import('./pages/product-form.component').then((m) => m.ProductFormComponent), title: 'Edit product' },
          { path: 'categories', loadComponent: () => import('./pages/admin.pages').then((m) => m.AdminCategoriesComponent), title: 'Categories' },
          { path: 'orders', loadComponent: () => import('./pages/admin.pages').then((m) => m.AdminOrdersComponent), title: 'Manage orders' },
          { path: 'orders/:id', loadComponent: () => import('./pages/admin.pages').then((m) => m.AdminOrderComponent), title: 'Manage order' },
          { path: 'inventory', loadComponent: () => import('./pages/admin.pages').then((m) => m.AdminInventoryComponent), title: 'Inventory' },
          { path: 'coupons', loadComponent: () => import('./pages/admin.pages').then((m) => m.AdminCouponsComponent), title: 'Coupons' },
        ],
      },
      { path: 'about', loadComponent: () => import('./pages/static.page').then((m) => m.StaticPageComponent), data: { page: 'about' }, title: 'About' },
      { path: 'shipping', loadComponent: () => import('./pages/static.page').then((m) => m.StaticPageComponent), data: { page: 'shipping' }, title: 'Shipping' },
      { path: 'returns', loadComponent: () => import('./pages/static.page').then((m) => m.StaticPageComponent), data: { page: 'returns' }, title: 'Returns' },
      { path: 'privacy', loadComponent: () => import('./pages/static.page').then((m) => m.StaticPageComponent), data: { page: 'privacy' }, title: 'Privacy' },
      { path: 'terms', loadComponent: () => import('./pages/static.page').then((m) => m.StaticPageComponent), data: { page: 'terms' }, title: 'Terms' },
      { path: '**', loadComponent: () => import('./pages/static.page').then((m) => m.NotFoundComponent), title: 'Not found' },
    ],
  },
];
