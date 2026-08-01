import { test, expect } from '@playwright/test'

// Generic smoke test: the SPA boots, a seeded user can sign in, and the
// model-driven entity admin renders with at least one entity. Add
// project-specific CRUD flows alongside this file.

test('sign in and load the entity admin', async ({ page }) => {
  await page.goto('/')

  await expect(page.locator('vg-auth h2')).toHaveText('Sign in')

  await page.fill('input[name=email]', '$$seedEmail$$')
  await page.fill('input[name=password]', '$$seedPassword$$')
  await page.click('vg-auth button[type=submit]')

  await expect(page.locator('.vg-auth-bar b')).toHaveText('$$seedEmail$$')
  await expect(page.locator('vg-entity-admin nav a')).not.toHaveCount(0)

  // The first entity's list loads (count line rendered).
  await expect(page.locator('#vg-count')).toBeVisible()
})
