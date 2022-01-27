const ham = document.querySelector('#ham')
const sideMenu = document.querySelector('#sideMenu')
const main_content = document.querySelector('#main_content')

ham.addEventListener('click', () => {
    if (sideMenu.classList.contains('hidden')) {
        main_content.classList.remove('md:w-screen');
        sideMenu.classList.remove('hidden');
    }else{
        sideMenu.classList.add('hidden');
        main_content.classList.add('md:w-screen');
        // main_content.classList.add('md:col-span-4');
        // main_content.classList.add('md:w-10/12');
    }
})
// ham.addEventListener('click', () => {
//     if (main_content.classList.contains('w-4/5')) {
//         sideMenu.classList.remove('w-4/5');
//     }else{
//         sideMenu.classList.add('w-4/5');
//     }
// })