import {test,expect} from "@playwright/test";
test("workspace sections link to existing routes and Orbit retains its controls", async ({page},info)=>{
 await page.goto("/");await page.getByRole("button",{name:/Explore Demo/}).click();await page.getByRole("heading",{name:"Today.",exact:true}).waitFor();
 const routes=[['/network','People views','Orbit'],['/pipeline','Work views','Follow-ups & activity'],['/focus','Today views','My Focus']];
 for(const [route,label,link] of routes){await page.goto(`/#${route}`);await expect(page.getByRole('navigation',{name:label})).toBeVisible();await expect(page.getByRole('navigation',{name:label}).getByRole('link',{name:link,exact:true})).toBeVisible();}
 await page.goto('/#/orbit');await expect(page.locator('.orbit-viewport')).toBeVisible();await expect(page.locator('.orbit-dimensional-background')).toBeAttached();await expect(page.locator('.orbit-record-list')).toBeVisible();
 if(info.project.name==='desktop')await expect(page.getByRole('navigation',{name:'Main areas'}).getByRole('link',{name:'People'})).toHaveAttribute('aria-current','page');
});
