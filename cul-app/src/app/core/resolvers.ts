import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { CatalogService } from './catalog.service';
import { HomeData, Listing, ProductPayload } from './models';

export const homeResolver: ResolveFn<HomeData> = () => inject(CatalogService).home();

export const shopResolver: ResolveFn<Listing> = (route) => {
  const page = Number(route.queryParamMap.get('page') ?? '1');
  return inject(CatalogService).list({
    q: route.queryParamMap.get('q') ?? '',
    category: route.paramMap.get('slug') ?? '',
    sort: route.queryParamMap.get('sort') ?? 'newest',
    min: route.queryParamMap.get('min'),
    max: route.queryParamMap.get('max'),
    page,
  });
};

export const productResolver: ResolveFn<ProductPayload> = (route) =>
  inject(CatalogService).productPage(route.paramMap.get('slug') ?? '');
