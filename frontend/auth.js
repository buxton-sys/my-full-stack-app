document.getElementById("loginForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const login = document.getElementById("login").value;
    const password = document.getElementById("password").value;

    try {
        const data = await apiRequest("/login", "POST", { login, password });
        localStorage.setItem("jwt", data.token);
        document.getElementById("message").innerText = "Login successful!";
        // Redirect to dashboard
        window.location.href = "dashboard.html";
    } catch (err) {
        document.getElementById("message").innerText = err.message;
    }
});
