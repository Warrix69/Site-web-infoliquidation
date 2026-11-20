<?php
/** Sélecteur FR / EN — conserve la page courante (slugs traduits). */
$tone = $tone ?? 'default';
$onGreen = $tone === 'onGreen';
?>
<div role="group" aria-label="<?= te('nav.langSwitchLabel') ?>" class="inline-flex items-center gap-0.5 rounded-full border p-0.5 <?= $onGreen ? 'border-ink/15 bg-ink/10' : 'border-line bg-surface/60' ?>">
  <?php foreach (LOCALES as $l): $active = $l === locale(); ?>
    <a href="<?= e(alternate_path($l)) ?>" hreflang="<?= $l ?>"<?= $active ? ' aria-current="true"' : '' ?> class="rounded-full px-2.5 py-1 font-display text-xs font-bold uppercase tracking-wide transition-colors <?= $active ? ($onGreen ? 'bg-ink text-paper' : 'bg-gradient-accent text-ink') : ($onGreen ? 'text-ink/70 hover:text-ink' : 'text-moss hover:text-mist') ?>"><?= $l ?></a>
  <?php endforeach; ?>
</div>
