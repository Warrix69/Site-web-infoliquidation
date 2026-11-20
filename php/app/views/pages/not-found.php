<?php /** Port de src/app/[locale]/not-found.tsx — echo seulement (rendu par render('pages/not-found')). */ ?>
<section class="relative flex min-h-[70vh] flex-col items-center justify-center px-5 pt-24 text-center">
  <p class="font-display text-7xl font-bold text-gradient sm:text-8xl">404</p>
  <h1 class="mt-4 font-display text-2xl font-bold text-mist sm:text-3xl"><?= te('notFound.title') ?></h1>
  <p class="mt-3 max-w-md text-moss"><?= te('notFound.text') ?></p>
  <div class="mt-8">
    <?= primary_button(path('/'), t('notFound.back')) ?>
  </div>
</section>
