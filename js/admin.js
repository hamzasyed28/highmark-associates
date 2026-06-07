import { listings as defaultListings } from './listings.js';
import { config as defaultConfig }   from './config.js';
import { blogs as defaultBlogs }     from './blogs.js';
import { agents as defaultAgents }   from './agents.js';
import { ceo as defaultCeo }         from './ceo.js';
import { getData, setData, verifyToken } from './db.js';

// ── Module-level data ─────────────────────────────────────────────────────────
let listings, config, blogs, agents, ceo;

// Admin password: stored in localStorage for login UI, also sent as API token
const getAdminPass = () => localStorage.getItem('hm_admin_pass') || 'admin123';

// ── Boot ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    // Auth runs first (shows login overlay or dashboard immediately)
    initAuth();

    // Load all data from server (with static file fallbacks)
    showLoadingBar(true);
    try {
        [listings, config, blogs, agents, ceo] = await Promise.all([
            getData('listings', defaultListings),
            getData('config',   defaultConfig),
            getData('blogs',    defaultBlogs),
            getData('agents',   defaultAgents),
            getData('ceo',      defaultCeo),
        ]);
    } catch (err) {
        console.error('[Admin] Data load error:', err);
    }
    showLoadingBar(false);

    initTabs();
    renderAdminListings();
    initForms();
    initExport();
    renderAdminBlogs();
    renderAdminAgents();
    initCeoForm();
    initAgentForm();
    initCustomSelects();
    initPasswordChange();
    initMigrate();
});

// ── Loading bar ───────────────────────────────────────────────────────────────
const showLoadingBar = (show) => {
    const bar = document.getElementById('adminLoadingBar');
    if (bar) bar.style.display = show ? 'block' : 'none';
};

// ── Save helpers (async, write to server) ─────────────────────────────────────
const saveAndRefresh = async () => {
    try {
        showLoadingBar(true);
        await setData('listings', listings, getAdminPass());
        renderAdminListings();
    } catch (err) {
        alert('❌ Could not save listings.\n\n' + err.message + '\n\nTip: Make sure you uploaded the site to GoDaddy and the api/ folder exists.');
    } finally {
        showLoadingBar(false);
    }
};

const saveBlogsAndRefresh = async () => {
    try {
        showLoadingBar(true);
        await setData('blogs', blogs, getAdminPass());
        renderAdminBlogs();
    } catch (err) {
        alert('❌ Could not save blogs.\n\n' + err.message);
    } finally {
        showLoadingBar(false);
    }
};

const saveAgentsAndRefresh = async () => {
    try {
        showLoadingBar(true);
        await setData('agents', agents, getAdminPass());
        renderAdminAgents();
    } catch (err) {
        alert('❌ Could not save agents.\n\n' + err.message);
    } finally {
        showLoadingBar(false);
    }
};

// ── Authentication ────────────────────────────────────────────────────────────
const initAuth = () => {
    const form    = document.getElementById('loginForm');
    const overlay = document.getElementById('loginOverlay');
    const wrapper = document.getElementById('adminWrapper');

    if (sessionStorage.getItem('hm_auth')) {
        overlay.style.display = 'none';
        wrapper.style.display = 'flex';
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const pass = document.getElementById('adminPass').value;
        
        // Show loading state on login button
        const btn = form.querySelector('button[type="submit"]');
        const origText = btn.textContent;
        btn.textContent = 'Unlocking...';
        btn.disabled = true;

        try {
            // Verify password on the server
            const verified = await verifyToken(pass);
            if (verified) {
                localStorage.setItem('hm_admin_pass', pass);
                sessionStorage.setItem('hm_auth', 'true');
                overlay.style.display = 'none';
                wrapper.style.display = 'flex';
                // Reload window to ensure all dynamic components load with the verified token
                window.location.reload();
            } else {
                alert('❌ Incorrect password. Please try again.');
            }
        } catch (err) {
            // Fallback for offline testing or before first server upload
            console.warn('[Admin] Offline or server unreachable, falling back to local verification.', err.message);
            if (pass === getAdminPass()) {
                sessionStorage.setItem('hm_auth', 'true');
                overlay.style.display = 'none';
                wrapper.style.display = 'flex';
            } else {
                alert('Incorrect Password (Local Check)');
            }
        } finally {
            btn.textContent = origText;
            btn.disabled = false;
        }
    });

    document.getElementById('logoutBtn').addEventListener('click', () => {
        sessionStorage.removeItem('hm_auth');
        window.location.reload();
    });
};

// ── Tab Navigation ────────────────────────────────────────────────────────────
const initTabs = () => {
    const navItems = document.querySelectorAll('.admin-nav-item');
    const tabs     = document.querySelectorAll('.admin-tab-content');
    const tabTitle = document.getElementById('tabTitle');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            if (!item.dataset.tab) return;

            navItems.forEach(i => i.classList.remove('active'));
            tabs.forEach(t => t.classList.remove('active'));

            item.classList.add('active');
            document.getElementById(item.dataset.tab).classList.add('active');

            const textNode = item.querySelector('.nav-text');
            if (tabTitle) tabTitle.textContent = textNode ? textNode.textContent : item.textContent;
        });
    });
};

// ── Listings Management ───────────────────────────────────────────────────────
const renderAdminListings = () => {
    const body = document.getElementById('listingsBody');
    body.innerHTML = '';

    listings.forEach(p => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td data-label="Image"><img src="${p.image}" class="img-preview" /></td>
            <td data-label="Title"><strong>${p.title}</strong><br><small>${p.location}</small></td>
            <td data-label="Type"><span class="status-pill">${p.type}</span></td>
            <td data-label="Price">${p.price}</td>
            <td data-label="Category">${p.category.toUpperCase()}</td>
            <td data-label="Actions">
                <button class="btn-action btn-edit"   onclick="window.editListing(${p.id})">Edit</button>
                <button class="btn-action btn-delete" onclick="window.deleteListing(${p.id})">Delete</button>
            </td>
        `;
        body.appendChild(tr);
    });
};

window.editListing = (id) => {
    const p = listings.find(item => item.id === id);
    if (!p) return;

    document.getElementById('editId').value   = p.id;
    document.getElementById('ltitle').value   = p.title;
    document.getElementById('lcat').value     = p.category;
    document.getElementById('lprice').value   = p.price;
    document.getElementById('lloc').value     = p.location;
    document.getElementById('limg').value     = p.image || '';
    document.getElementById('larea').value    = p.specs.area  || '';
    document.getElementById('lbeds').value    = p.specs.beds  || '';
    document.getElementById('lbaths').value   = p.specs.baths || '';
    document.getElementById('ldesc').value    = p.description || '';

    const imgPreview = document.getElementById('imgPreview');
    if (p.image) { imgPreview.src = p.image; imgPreview.style.display = 'block'; }
    else         { imgPreview.style.display = 'none'; imgPreview.src = ''; }
    document.getElementById('limgFile').value = '';

    // Gallery
    document.getElementById('lgalleryFile').value = '';
    const hiddenGalleryInput = document.getElementById('lgallery');
    hiddenGalleryInput.value = p.gallery ? JSON.stringify(p.gallery) : '[]';
    renderGalleryPreview();

    document.getElementById('modalTitle').textContent = 'Edit Property Details';
    document.getElementById('listingModal').classList.add('open');
};

window.deleteListing = (id) => {
    if (confirm('Are you sure you want to delete this listing?')) {
        listings = listings.filter(item => item.id !== id);
        saveAndRefresh();
    }
};

// ── Form Handlers ─────────────────────────────────────────────────────────────
const initForms = () => {
    // ── Listing image upload ──
    const imgFileInput   = document.getElementById('limgFile');
    const imgPreview     = document.getElementById('imgPreview');
    const hiddenImgInput = document.getElementById('limg');

    imgFileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) {
            try {
                const compressed = await compressImage(file);
                hiddenImgInput.value   = compressed;
                imgPreview.src         = compressed;
                imgPreview.style.display = 'block';
            } catch {
                alert('Failed to process image. Try a smaller file.');
            }
        }
    });

    // ── Gallery upload ──
    const galleryFileInput   = document.getElementById('lgalleryFile');
    const hiddenGalleryInput = document.getElementById('lgallery');

    window.renderGalleryPreview = () => {
        const galleryPreview = document.getElementById('galleryPreview');
        galleryPreview.innerHTML = '';
        try {
            JSON.parse(hiddenGalleryInput.value || '[]').forEach((imgSrc, index) => {
                const wrap = document.createElement('div');
                wrap.style.position = 'relative';
                wrap.innerHTML = `
                    <img src="${imgSrc}" style="width:60px;height:60px;object-fit:cover;border-radius:4px;border:1px solid rgba(255,255,255,0.1);" />
                    <button type="button" onclick="removeGalleryImage(${index})" style="position:absolute;top:-5px;right:-5px;background:red;color:white;border-radius:50%;width:20px;height:20px;font-size:10px;display:flex;align-items:center;justify-content:center;">✕</button>
                `;
                galleryPreview.appendChild(wrap);
            });
        } catch(e) {}
    };

    window.removeGalleryImage = (index) => {
        try {
            const arr = JSON.parse(hiddenGalleryInput.value || '[]');
            arr.splice(index, 1);
            hiddenGalleryInput.value = JSON.stringify(arr);
            renderGalleryPreview();
        } catch(e) {}
    };

    galleryFileInput.addEventListener('change', async (e) => {
        const files = Array.from(e.target.files);
        if (files.length > 0) {
            try {
                let current = JSON.parse(hiddenGalleryInput.value || '[]');
                for (const file of files) {
                    current.push(await compressImage(file));
                }
                hiddenGalleryInput.value = JSON.stringify(current);
                renderGalleryPreview();
            } catch {
                alert('Failed to process some gallery images.');
            }
        }
    });

    // ── Show / hide listing modal ──
    document.getElementById('addListingBtn').addEventListener('click', () => {
        document.getElementById('listingForm').reset();
        document.getElementById('editId').value = '';
        imgPreview.style.display = 'none';
        imgPreview.src = '';
        hiddenImgInput.value = '';
        hiddenGalleryInput.value = '[]';
        renderGalleryPreview();
        document.getElementById('modalTitle').textContent = 'Add Property Listing';
        document.getElementById('listingModal').classList.add('open');
    });

    document.getElementById('closeModal').addEventListener('click', () => {
        document.getElementById('listingModal').classList.remove('open');
    });

    // ── Listing form submit ──
    document.getElementById('listingForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const editId = document.getElementById('editId').value;
        let galleryArr = [];
        try { galleryArr = JSON.parse(document.getElementById('lgallery').value || '[]'); } catch(e) {}

        const newListing = {
            id:          editId ? parseInt(editId) : Date.now(),
            category:    document.getElementById('lcat').value,
            type:        document.getElementById('lcat').value === 'sale' ? 'House' : 'Apartment',
            title:       document.getElementById('ltitle').value,
            location:    document.getElementById('lloc').value,
            price:       document.getElementById('lprice').value,
            priceNote:   '',
            image:       document.getElementById('limg').value,
            description: document.getElementById('ldesc').value,
            gallery:     galleryArr,
            specs: {
                area:  document.getElementById('larea').value,
                beds:  document.getElementById('lbeds').value,
                baths: document.getElementById('lbaths').value
            },
            tags:     ['Verified'],
            featured: true
        };

        if (editId) {
            listings = listings.map(item => item.id === parseInt(editId) ? newListing : item);
        } else {
            listings.push(newListing);
        }

        saveAndRefresh();
        document.getElementById('listingModal').classList.remove('open');
    });

    // ── Config / Credentials form ──
    const cForm = document.getElementById('configForm');
    cForm.phone.value    = config.contact.phone;
    cForm.whatsapp.value = config.contact.whatsapp;
    cForm.email.value    = config.contact.email;
    cForm.address.value  = config.contact.address;

    cForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        config.contact.phone    = cForm.phone.value;
        config.contact.whatsapp = cForm.whatsapp.value;
        config.contact.email    = cForm.email.value;
        config.contact.address  = cForm.address.value;
        // Auto-update whatsapp link when number changes
        config.social.whatsappLink = `https://wa.me/${cForm.whatsapp.value.replace(/[^0-9]/g, '')}`;

        try {
            showLoadingBar(true);
            await setData('config', config, getAdminPass());
            alert('✅ Credentials saved! Live on all devices immediately.');
        } catch (err) {
            alert('❌ Could not save credentials.\n\n' + err.message);
        } finally {
            showLoadingBar(false);
        }
    });

    // ── Blog image upload ──
    const bimgFileInput = document.getElementById('bimgFile');
    const bimgPreview   = document.getElementById('bimgPreview');
    const bHiddenImg    = document.getElementById('bimg');

    bimgFileInput?.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) {
            try {
                const compressed  = await compressImage(file);
                bHiddenImg.value  = compressed;
                bimgPreview.src   = compressed;
                bimgPreview.style.display = 'block';
            } catch { alert('Image compression failed'); }
        }
    });

    document.getElementById('addBlogBtn')?.addEventListener('click', () => {
        document.getElementById('blogForm').reset();
        document.getElementById('bEditId').value = '';
        if (bimgPreview) { bimgPreview.style.display = 'none'; bimgPreview.src = ''; }
        if (bHiddenImg)    bHiddenImg.value = '';
        document.getElementById('bModalTitle').textContent = 'Add New Blog';
        document.getElementById('blogModal').classList.add('open');
    });

    document.getElementById('closeBlogModal')?.addEventListener('click', () => {
        document.getElementById('blogModal').classList.remove('open');
    });

    document.getElementById('blogForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const editId  = document.getElementById('bEditId').value;
        const newBlog = {
            id:      editId || `blog_${Date.now()}`,
            title:   document.getElementById('btitle').value,
            content: document.getElementById('bcontent').value,
            image:   bHiddenImg?.value || '',
            date:    new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
            excerpt: document.getElementById('bcontent').value.substring(0, 120) + '...'
        };
        if (editId) {
            blogs = blogs.map(item => item.id == editId ? newBlog : item);
        } else {
            blogs.push(newBlog);
        }
        saveBlogsAndRefresh();
        document.getElementById('blogModal').classList.remove('open');
    });
};

// ── Blogs Rendering ───────────────────────────────────────────────────────────
const renderAdminBlogs = () => {
    const body = document.getElementById('blogsBody');
    if (!body) return;
    body.innerHTML = '';

    blogs.forEach(b => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td data-label="Image"><img src="${b.image}" class="img-preview" /></td>
            <td data-label="Title"><strong>${b.title}</strong><br><small>${b.date}</small></td>
            <td data-label="Actions">
                <button class="btn-action btn-edit"   onclick="window.editBlog('${b.id}')">Edit</button>
                <button class="btn-action btn-delete" onclick="window.deleteBlog('${b.id}')">Delete</button>
            </td>
        `;
        body.appendChild(tr);
    });
};

window.editBlog = (id) => {
    const b = blogs.find(item => item.id == id);
    if (!b) return;
    document.getElementById('bEditId').value   = b.id;
    document.getElementById('btitle').value    = b.title;
    document.getElementById('bcontent').value  = b.content;
    document.getElementById('bimg').value      = b.image || '';
    const preview = document.getElementById('bimgPreview');
    if (b.image) { preview.src = b.image; preview.style.display = 'block'; }
    else         { preview.style.display = 'none'; }
    document.getElementById('bModalTitle').textContent = 'Edit Blog';
    document.getElementById('blogModal').classList.add('open');
};

window.deleteBlog = (id) => {
    if (confirm('Delete this blog post?')) {
        blogs = blogs.filter(item => item.id != id);
        saveBlogsAndRefresh();
    }
};

// ── CEO Management ────────────────────────────────────────────────────────────
const initCeoForm = () => {
    const form = document.getElementById('ceoForm');
    if (!form) return;

    document.getElementById('ceoNameInput').value  = ceo.name        || '';
    document.getElementById('ceoTitleInput').value = ceo.designation || '';
    document.getElementById('ceoBioInput').value   = ceo.bio         || '';

    const imgPreview = document.getElementById('ceoImgPreview');
    const hiddenImg  = document.getElementById('ceoImgInput');
    hiddenImg.value  = ceo.image || '';
    if (ceo.image) { imgPreview.src = ceo.image; imgPreview.style.display = 'block'; }

    document.getElementById('ceoImgFileInput').addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) {
            try {
                const compressed   = await compressImage(file);
                hiddenImg.value    = compressed;
                imgPreview.src     = compressed;
                imgPreview.style.display = 'block';
            } catch { alert('Image compression failed'); }
        }
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        ceo.name        = document.getElementById('ceoNameInput').value;
        ceo.designation = document.getElementById('ceoTitleInput').value;
        ceo.bio         = document.getElementById('ceoBioInput').value;
        ceo.image       = hiddenImg.value;

        try {
            showLoadingBar(true);
            await setData('ceo', ceo, getAdminPass());
            alert('✅ CEO details saved! Live everywhere immediately.');
        } catch (err) {
            alert('❌ Could not save CEO details.\n\n' + err.message);
        } finally {
            showLoadingBar(false);
        }
    });
};

// ── Agents Management ─────────────────────────────────────────────────────────
const renderAdminAgents = () => {
    const body = document.getElementById('agentsBody');
    if (!body) return;
    body.innerHTML = '';

    agents.forEach(a => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td data-label="Image">${a.image ? `<img src="${a.image}" class="img-preview" />` : '<span style="font-size:1.5rem;">👤</span>'}</td>
            <td data-label="Name"><strong>${a.name}</strong></td>
            <td data-label="Title">${a.title}</td>
            <td data-label="Phone">${a.phone}</td>
            <td data-label="WhatsApp">${a.whatsapp}</td>
            <td data-label="Speciality"><small>${a.speciality}</small></td>
            <td data-label="Actions">
                <button class="btn-action btn-edit"   onclick="window.editAgent(${a.id})">Edit</button>
                <button class="btn-action btn-delete" onclick="window.deleteAgent(${a.id})">Delete</button>
            </td>
        `;
        body.appendChild(tr);
    });
};

window.editAgent = (id) => {
    const a = agents.find(item => item.id === id);
    if (!a) return;

    document.getElementById('agentEditId').value  = a.id;
    document.getElementById('aName').value        = a.name;
    document.getElementById('aTitle').value       = a.title;
    document.getElementById('aPhone').value       = a.phone;
    document.getElementById('aWhatsapp').value    = a.whatsapp;
    document.getElementById('aSpeciality').value  = a.speciality;

    const hiddenImg = document.getElementById('aImg');
    const preview   = document.getElementById('aImgPreview');
    hiddenImg.value = a.image || '';
    if (a.image) { preview.src = a.image; preview.style.display = 'block'; }
    else         { preview.src = ''; preview.style.display = 'none'; }

    document.getElementById('agentModalTitle').textContent = 'Edit Team Agent';
    document.getElementById('agentModal').classList.add('open');
};

window.deleteAgent = (id) => {
    if (confirm('Are you sure you want to delete this agent?')) {
        agents = agents.filter(item => item.id !== id);
        saveAgentsAndRefresh();
    }
};

const initAgentForm = () => {
    const form = document.getElementById('agentForm');
    if (!form) return;

    document.getElementById('aImgFile').addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) {
            try {
                const compressed = await compressImage(file);
                document.getElementById('aImg').value           = compressed;
                document.getElementById('aImgPreview').src      = compressed;
                document.getElementById('aImgPreview').style.display = 'block';
            } catch { alert('Image compression failed'); }
        }
    });

    document.getElementById('addAgentBtn')?.addEventListener('click', () => {
        form.reset();
        document.getElementById('agentEditId').value       = '';
        document.getElementById('aImg').value              = '';
        document.getElementById('aImgPreview').style.display = 'none';
        document.getElementById('aImgPreview').src         = '';
        document.getElementById('agentModalTitle').textContent = 'Add Team Agent';
        document.getElementById('agentModal').classList.add('open');
    });

    document.getElementById('closeAgentModal')?.addEventListener('click', () => {
        document.getElementById('agentModal').classList.remove('open');
    });

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const editId   = document.getElementById('agentEditId').value;
        const newAgent = {
            id:         editId ? parseInt(editId) : Date.now(),
            name:       document.getElementById('aName').value,
            title:      document.getElementById('aTitle').value,
            phone:      document.getElementById('aPhone').value,
            whatsapp:   document.getElementById('aWhatsapp').value,
            speciality: document.getElementById('aSpeciality').value,
            image:      document.getElementById('aImg').value
        };

        if (editId) {
            agents = agents.map(item => item.id === parseInt(editId) ? newAgent : item);
        } else {
            agents.push(newAgent);
        }

        saveAgentsAndRefresh();
        document.getElementById('agentModal').classList.remove('open');
    });
};

// ── Password Change ───────────────────────────────────────────────────────────
const initPasswordChange = () => {
    const form = document.getElementById('changePassForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const currentPass = document.getElementById('currentPass').value;
        const newPass     = document.getElementById('newPass').value;
        const confirmPass = document.getElementById('confirmPass').value;

        if (currentPass !== getAdminPass()) {
            showPassMsg('❌ Current password is incorrect.', 'error');
            return;
        }
        if (newPass.length < 6) {
            showPassMsg('❌ New password must be at least 6 characters.', 'error');
            return;
        }
        if (newPass !== confirmPass) {
            showPassMsg('❌ New passwords do not match.', 'error');
            return;
        }

        try {
            showLoadingBar(true);
            // Update server token first (validates current pass server-side too)
            await setData('admin_token', newPass, currentPass);
            // If server accepted, update local storage too
            localStorage.setItem('hm_admin_pass', newPass);
            form.reset();
            showPassMsg('✅ Password updated on server & locally! Use the new password next login.', 'success');
        } catch (err) {
            showPassMsg('❌ Server rejected password change: ' + err.message, 'error');
        } finally {
            showLoadingBar(false);
        }
    });
};

const showPassMsg = (msg, type) => {
    const el = document.getElementById('passChangeMsg');
    if (!el) return;
    el.textContent = msg;
    el.className   = 'pass-msg ' + type;
    el.style.display = 'block';
    setTimeout(() => { el.style.display = 'none'; }, 6000);
};

// ── Migrate localStorage → Server ─────────────────────────────────────────────
const initMigrate = () => {
    const btn = document.getElementById('migrateBtn');
    if (!btn) return;

    btn.addEventListener('click', async () => {
        const hasLocal =
            localStorage.getItem('hm_listings') ||
            localStorage.getItem('hm_agents')   ||
            localStorage.getItem('hm_blogs')    ||
            localStorage.getItem('hm_config')   ||
            localStorage.getItem('hm_ceo');

        if (!hasLocal) {
            alert('ℹ️ No old data found in localStorage. Nothing to migrate.');
            return;
        }

        if (!confirm('This will upload your locally saved data (from this browser) to the server, making it live everywhere. Proceed?')) return;

        try {
            showLoadingBar(true);
            const token = getAdminPass();
            const jobs  = [];

            const lsListings = JSON.parse(localStorage.getItem('hm_listings'));
            const lsAgents   = JSON.parse(localStorage.getItem('hm_agents'));
            const lsBlogs    = JSON.parse(localStorage.getItem('hm_blogs'));
            const lsConfig   = JSON.parse(localStorage.getItem('hm_config'));
            const lsCeo      = JSON.parse(localStorage.getItem('hm_ceo'));

            if (lsListings) jobs.push(setData('listings', lsListings, token));
            if (lsAgents)   jobs.push(setData('agents',   lsAgents,   token));
            if (lsBlogs)    jobs.push(setData('blogs',    lsBlogs,    token));
            if (lsConfig)   jobs.push(setData('config',   lsConfig,   token));
            if (lsCeo)      jobs.push(setData('ceo',      lsCeo,      token));

            await Promise.all(jobs);

            // Clear old localStorage data keys
            ['hm_listings','hm_agents','hm_blogs','hm_config','hm_ceo'].forEach(k => localStorage.removeItem(k));

            alert('✅ Migration complete! All data is now on the server and live everywhere. Reloading…');
            window.location.reload();
        } catch (err) {
            alert('❌ Migration failed: ' + err.message + '\n\nMake sure the site is uploaded to GoDaddy first.');
        } finally {
            showLoadingBar(false);
        }
    });
};

// ── Export (kept as backup download) ─────────────────────────────────────────
const initExport = () => {
    const preview = document.getElementById('codePreview');
    if (!preview) return;

    const dl = (id, key, data) => {
        document.getElementById(id)?.addEventListener('click', () => {
            const content = `export const ${key} = ${JSON.stringify(data, null, 2)};`;
            preview.value = content;
            downloadFile(key + '.js', content);
        });
    };

    dl('exportListings', 'listings', listings);
    dl('exportConfig',   'config',   config);
    dl('exportBlogs',    'blogs',    blogs);
    dl('exportAgents',   'agents',   agents);
    dl('exportCeo',      'ceo',      ceo);
};

const downloadFile = (filename, text) => {
    const a = document.createElement('a');
    a.setAttribute('href', 'data:text/javascript;charset=utf-8,' + encodeURIComponent(text));
    a.setAttribute('download', filename);
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
};

// ── Image Compression ─────────────────────────────────────────────────────────
const compressImage = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = event => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
            const canvas   = document.createElement('canvas');
            const MAX_WIDTH = 800;
            const scale    = MAX_WIDTH / img.width;
            canvas.width   = scale < 1 ? MAX_WIDTH  : img.width;
            canvas.height  = scale < 1 ? img.height * scale : img.height;
            canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL('image/jpeg', 0.7));
        };
        img.onerror = reject;
    };
    reader.onerror = reject;
});

// ── Custom Selects ────────────────────────────────────────────────────────────
const initCustomSelects = () => {
    document.querySelectorAll('select').forEach(select => {
        if (select.classList.contains('native-select-hidden')) return;

        const wrapper  = document.createElement('div');
        wrapper.className = 'custom-select-wrapper';

        const trigger  = document.createElement('div');
        trigger.className = 'custom-select-trigger';
        trigger.textContent = select.options[select.selectedIndex]?.textContent || 'Select';

        const optionsContainer = document.createElement('div');
        optionsContainer.className = 'custom-options';

        Array.from(select.options).forEach((option, index) => {
            const customOption = document.createElement('div');
            customOption.className = 'custom-option';
            customOption.textContent = option.textContent;
            if (index === select.selectedIndex) customOption.classList.add('selected');

            customOption.addEventListener('click', (e) => {
                e.stopPropagation();
                select.selectedIndex = index;
                select.dispatchEvent(new Event('change'));
                trigger.textContent = option.textContent;
                optionsContainer.querySelectorAll('.custom-option').forEach(opt => opt.classList.remove('selected'));
                customOption.classList.add('selected');
                wrapper.classList.remove('open');
            });
            optionsContainer.appendChild(customOption);
        });

        wrapper.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = wrapper.classList.contains('open');
            document.querySelectorAll('.custom-select-wrapper').forEach(w => w.classList.remove('open'));
            if (!isOpen) wrapper.classList.add('open');
        });

        select.parentNode.insertBefore(wrapper, select);
        wrapper.appendChild(select);
        wrapper.appendChild(trigger);
        wrapper.appendChild(optionsContainer);
        select.classList.add('native-select-hidden');

        select.addEventListener('change', () => {
            trigger.textContent = select.options[select.selectedIndex]?.textContent || 'Select';
            optionsContainer.querySelectorAll('.custom-option').forEach((opt, idx) => {
                if (idx === select.selectedIndex) opt.classList.add('selected');
                else opt.classList.remove('selected');
            });
        });
    });

    document.addEventListener('click', () => {
        document.querySelectorAll('.custom-select-wrapper').forEach(w => w.classList.remove('open'));
    });
};
