// script.js

// ==================== STATE MANAGEMENT ====================
class StateManager {
    constructor() {
        this.state = {
            currentUser: null,
            familyMembers: [],
            treeData: {}
        };
        this.loadFromStorage();
    }

    setState(newState) {
        this.state = { ...this.state, ...newState };
        this.saveToStorage();
    }

    getState() {
        return this.state;
    }

    saveToStorage() {
        if (this.state.currentUser) {
            const userData = {
                username: this.state.currentUser,
                members: this.state.familyMembers,
                treeData: this.state.treeData
            };
            localStorage.setItem(`familyTree_${this.state.currentUser}`, JSON.stringify(userData));
        }
    }

    loadFromStorage() {
        // Only load data if user is logged in
        if (this.state.currentUser) {
            const userData = JSON.parse(localStorage.getItem(`familyTree_${this.state.currentUser}`) || '{}');
            if (userData.members) {
                this.state.familyMembers = userData.members;
                this.state.treeData = userData.treeData || {};
            }
        }
    }

    clearUserData() {
        this.state = {
            currentUser: null,
            familyMembers: [],
            treeData: {}
        };
    }
}

// ==================== AUTHENTICATION ====================
class Auth {
    constructor(stateManager) {
        this.stateManager = stateManager;
    }

    createProfile(username, password) {
        // Simple validation
        if (!username || !password || username.length < 3 || password.length < 6) {
            return {
                success: false,
                message: 'Username must be at least 3 characters and password at least 6 characters'
            };
        }

        // Check if profile already exists
        const existingData = localStorage.getItem(`familyTree_${username}`);
        if (existingData) {
            return {
                success: false,
                message: 'Profile with this username already exists. Please use a different username.'
            };
        }

        // Create new profile
        this.stateManager.setState({
            currentUser: username,
            familyMembers: [],
            treeData: {}
        });

        return {
            success: true,
            message: 'Profile created successfully!'
        };
    }

    login(username, password) {
        // For privacy, verify the profile exists
        const userData = JSON.parse(localStorage.getItem(`familyTree_${username}`) || 'null');
        
        if (!userData) {
            // No profile exists, so create one with provided credentials
            return this.createProfile(username, password);
        }

        // If profile exists, authenticate the user
        this.stateManager.setState({
            currentUser: username,
            familyMembers: userData.members || [],
            treeData: userData.treeData || {}
        });

        return {
            success: true,
            message: 'Logged in successfully!'
        };
    }

    logout() {
        this.stateManager.clearUserData();
    }
}

// ==================== TREE LAYOUT ENGINE ====================
class TreeLayout {
    constructor(data) {
        this.data = data;
    }

    organizeByGeneration(members) {
        const generations = {
            grandfather: [],
            father: [],
            son: [],
            grandson: []
        };

        members.forEach(member => {
            if (generations[member.generation]) {
                generations[member.generation].push(member);
            }
        });

        return generations;
    }

    buildHierarchy(members) {
        const hierarchy = {};
        
        members.forEach(member => {
            if (!hierarchy[member.generation]) {
                hierarchy[member.generation] = [];
            }
            hierarchy[member.generation].push(member);
        });

        return hierarchy;
    }

    layout() {
        console.log('Organizing tree by generation:', this.data);
        return this.organizeByGeneration(this.data);
    }
}

// ==================== TREE RENDERER ====================
class TreeRenderer {
    constructor(container) {
        this.container = container;
    }

    render(familyMembers) {
        if (!familyMembers || familyMembers.length === 0) {
            this.container.innerHTML = '<p style="text-align: center; color: #999; padding: 2rem;">No family members added yet. Add members using the form on the left.</p>';
            return;
        }

        const treeLayout = new TreeLayout(familyMembers);
        const generations = treeLayout.layout();

        let html = '';

        // Render in order: Grandfather -> Father -> Son -> Grandson
        const generationOrder = ['grandfather', 'father', 'son', 'grandson'];

        generationOrder.forEach(gen => {
            if (generations[gen] && generations[gen].length > 0) {
                html += `<div class="generation-level">\n                    <div class="generation-label">${this.formatGenerationLabel(gen)}</div>`;

                if (gen === 'grandfather' || gen === 'father') {
                    // Group by family pairs (parents and their children)
                    const grouped = this.groupByFamily(generations[gen], generations, gen);
                    grouped.forEach(group => {
                        html += this.renderFamilyGroup(group, gen, generations);
                    });
                } else {
                    // Render children in a container
                    html += this.renderGeneration(generations[gen], gen);
                }

                html += '</div>';
            }
        });

        this.container.innerHTML = html;
    }

    groupByFamily(members, generations, currentGen) {
        // Simple grouping - can be enhanced for more complex hierarchies
        return members.map(member => ({ parent: member, children: [] }));
    }

    renderFamilyGroup(group, gen, generations) {
        const parent = group.parent;
        let html = '<div class="parent-pair">';

        html += this.renderNode(parent, gen);

        // Render children if in father generation
        if (gen === 'father' && generations.son && generations.son.length > 0) {
            const childrenOfThisFather = generations.son.filter(s => 
                s.parentId === parent.id || !s.parentId
            );
            if (childrenOfThisFather.length > 0) {
                html += '<div class="children-container">';
                childrenOfThisFather.forEach(child => {
                    html += this.renderNode(child, 'son');
                });
                html += '</div>';
            }
        }

        html += '</div>';
        return html;
    }

    renderGeneration(members, gen) {
        let html = '<div class="children-container">';
        members.forEach(member => {
            html += this.renderNode(member, gen);
        });
        html += '</div>';
        return html;
    }

    renderNode(member, gen) {
        const nodeClass = gen === 'son' || gen === 'grandson' ? 'child-node' : 'family-node';
        
        return `\n            <div class="node-container">\n                <div class="${nodeClass}">\n                    <div class="node-name">${member.firstName} ${member.lastName}</div>\n                    <div class="node-info">\n                        ${member.dateOfBirth ? `<div><span class="node-label">DOB:</span> ${member.dateOfBirth}</div>` : ''}\n                        ${member.profession ? `<div><span class="node-label">Profession:</span> ${member.profession}</div>` : ''}\n                        ${member.province ? `<div><span class="node-label">Province:</span> ${member.province}</div>` : ''}\n                        ${member.totem ? `<div><span class="node-label">Totem:</span> ${member.totem}</div>` : ''}\n                        <div><span class="node-label">Generation:</span> ${this.formatGenerationLabel(member.generation)}</div>\n                    </div>\n                </div>\n            </div>`;
    }

    formatGenerationLabel(gen) {
        const labels = {
            grandfather: 'Grandfather',
            father: 'Father',
            son: 'Son',
            grandson: 'Grandson'
        };
        return labels[gen] || gen;
    }
}

// ==================== UI CONTROLLER ====================
class UIController {
    constructor(stateManager, auth) {
        this.stateManager = stateManager;
        this.auth = auth;
        this.treeRenderer = new TreeRenderer(document.getElementById('familyTree'));
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Login form
        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        // Member form
        document.getElementById('memberForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleAddMember();
        });

        // Logout button
        document.getElementById('logoutBtn').addEventListener('click', () => {
            this.handleLogout();
        });
    }

    handleLogin() {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        const result = this.auth.login(username, password);

        if (result.success) {
            this.showApp();
            this.updateUI();
            document.getElementById('username').value = '';
            document.getElementById('password').value = '';
        } else {
            alert(result.message);
        }
    }

    handleAddMember() {
        const member = {
            id: Date.now().toString(),
            firstName: document.getElementById('firstName').value,
            lastName: document.getElementById('lastName').value,
            dateOfBirth: document.getElementById('dateOfBirth').value,
            profession: document.getElementById('profession').value,
            province: document.getElementById('province').value,
            totem: document.getElementById('totem').value,
            generation: document.getElementById('generation').value,
            parentId: document.getElementById('parentId').value || null
        };

        if (!member.firstName || !member.lastName || !member.generation) {
            alert('Please fill in all required fields');
            return;
        }

        const state = this.stateManager.getState();
        state.familyMembers.push(member);
        this.stateManager.setState({ familyMembers: state.familyMembers });

        this.updateUI();
        document.getElementById('memberForm').reset();

        // Show success message
        alert('Family member added successfully!');
    }

    handleLogout() {
        this.auth.logout();
        this.showLogin();
        this.updateUI();
    }

    updateUI() {
        const state = this.stateManager.getState();

        if (state.currentUser) {
            document.getElementById('currentUser').textContent = `Logged in as: ${state.currentUser}`;
        }

        // Update parent dropdown
        const parentSelect = document.getElementById('parentId');
        const currentGen = document.getElementById('generation').value;

        parentSelect.innerHTML = '<option value="">None (Root Member)</option>';

        if (currentGen === 'father') {
            // Fathers can have grandfathers as parents
            const grandfathers = state.familyMembers.filter(m => m.generation === 'grandfather');
            grandfathers.forEach(gf => {
                const option = document.createElement('option');
                option.value = gf.id;
                option.textContent = `${gf.firstName} ${gf.lastName}`;
                parentSelect.appendChild(option);
            });
        } else if (currentGen === 'son') {
            // Sons can have fathers as parents
            const fathers = state.familyMembers.filter(m => m.generation === 'father');
            fathers.forEach(f => {
                const option = document.createElement('option');
                option.value = f.id;
                option.textContent = `${f.firstName} ${f.lastName}`;
                parentSelect.appendChild(option);
            });
        } else if (currentGen === 'grandson') {
            // Grandsons can have sons as parents
            const sons = state.familyMembers.filter(m => m.generation === 'son');
            sons.forEach(s => {
                const option = document.createElement('option');
                option.value = s.id;
                option.textContent = `${s.firstName} ${s.lastName}`;
                parentSelect.appendChild(option);
            });
        }

        // Render tree
        this.treeRenderer.render(state.familyMembers);
    }

    showLogin() {
        document.getElementById('loginPage').classList.remove('hidden');
        document.getElementById('appPage').classList.add('hidden');
        document.querySelector('.user-info').classList.add('hidden');
    }

    showApp() {
        document.getElementById('loginPage').classList.add('hidden');
        document.getElementById('appPage').classList.remove('hidden');
        document.querySelector('.user-info').classList.remove('hidden');
    }
}

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', () => {
    const stateManager = new StateManager();
    const auth = new Auth(stateManager);
    const uiController = new UIController(stateManager, auth);

    // Check if user is already logged in
    const state = stateManager.getState();
    if (state.currentUser) {
        uiController.showApp();
        uiController.updateUI();
    } else {
        uiController.showLogin();
    }

    // Update parent dropdown when generation changes
    document.getElementById('generation').addEventListener('change', () => {
        uiController.updateUI();
    });
});