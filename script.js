"use strict";

const form = document.querySelector(".form");
const containerWorkouts = document.querySelector(".workouts");
const inputType = document.querySelector(".form__input--type");
const inputDistance = document.querySelector(".form__input--distance");
const inputDuration = document.querySelector(".form__input--duration");
const inputCadence = document.querySelector(".form__input--cadence");
const inputElevation = document.querySelector(".form__input--elevation");
const deleteAllBtn = document.querySelector(".del-all");

// Classe pai
class Workout {
  date = new Date();
  id = (Date.now() + "").slice(-10);

  constructor(coords, distance, duration) {
    this.coords = coords; // [lat, lng]
    this.distance = distance; // in km
    this.duration = duration; // in min
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }
}

// Classe filha de Workout
class Running extends Workout {
  type = "running";

  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();

    this._setDescription();
  }

  // min/km
  calcPace() {
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

// Classe filha de Workout
class Cycling extends Workout {
  type = "cycling";

  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();

    this._setDescription();
  }

  // km/h
  calcSpeed() {
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

// const run1 = new Running([39, -12], 5.2, 24, 178);
// const cycling1 = new Cycling([39, -12], 27, 95, 523);

// console.log(run1, cycling1);

////////////////////////////////////////
// APPLICATION ARCHITECTURE
class App {
  // Variáveis privadas
  #map;
  #mapZoomLevel = 13;
  #mapEvent;
  #workouts = [];
  #markers = new Map();

  constructor() {
    // Obtém a posição do utilizador no início do reload
    this._getPosition();

    // Obter dados do local storage
    this._getLocalStorage();

    // Event handlers (será sempre necessário o método bind)
    form.addEventListener("submit", this._newWorkout.bind(this));
    inputType.addEventListener("change", this._toggleElevationField.bind(this));

    containerWorkouts.addEventListener("click", this._moveToPopup.bind(this));

    deleteAllBtn.addEventListener("click", this._deleteAll.bind(this));

    containerWorkouts.addEventListener("click", this._deleteWorkout.bind(this));
  }

  // Método para obter a posição atual usando a API de geolocalização
  _getPosition() {
    // Permissão de localização no Google (chama o método _loadMap quando a posição for obtida)
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert("Could not get your position");
        }
      );
    }
  }

  // Método para receber a posição e apresentá-la no mapa
  _loadMap(position) {
    // Verifica se o mapa já foi inicializado (evita a reinicialização)
    if (this.#map) return;

    const { latitude } = position.coords;
    const { longitude } = position.coords;
    console.log(`https://www.google.pt/maps/@${latitude},${longitude}`);

    const coords = [latitude, longitude];

    this.#map = L.map("map").setView(coords, this.#mapZoomLevel);

    L.tileLayer("https://tile.openstreetmap.fr/hot/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    // Adiciona o event listener para abrir o mapa (existe o tratamento dos cliques no mapa)
    this.#map.on("click", this._showForm.bind(this));

    // Renderiza os marcadores
    this.#workouts.forEach((work) => {
      this._renderWorkoutMarker(work);
    });

    this._toggleDeleteAllButton();
  }

  // Método para clicar no mapa e apresentar o form
  _showForm(mapE) {
    this.#mapEvent = mapE; // Armazena o event listener para obter as coordenadas
    form.classList.remove("hidden"); // Mostra o form
    inputDistance.focus(); // Coloca o primeiro campo a piscar
  }

  // Método para esconder o form quando se cria um marker
  _hideForm() {
    // Esvaziar os campos
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        "";

    form.style.display = "none";
    form.classList.add("hidden");
    setTimeout(() => (form.style.display = "grid"), 1000);
  }

  // Método para alterar o input do workout (running/cycling)
  _toggleElevationField() {
    inputElevation.closest(".form__row").classList.toggle("form__row--hidden");
    inputCadence.closest(".form__row").classList.toggle("form__row--hidden");
    inputDistance.focus();

    //Outra opção
    //   [inputElevation, inputCadence].forEach(function(input) {
    //     input.closest(".form__row").classList.toggle("form__row--hidden");
    //   })
  }

  // Método para submeter o form e adicionar um marcador no mapa
  _newWorkout(e) {
    // Outra opção
    // const validInputs = (...inputs) =>
    //   inputs.every(function (inp) {
    //     return Number(isFinite(inp));
    //   });

    e.preventDefault();

    // Obter os dados do form
    const type = inputType.value;
    const distance = +inputDistance.value; // + serve para converter para nº
    const duration = +inputDuration.value; // + serve para converter para nº
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    // Se a atividade for Corrida, criar object corrida
    if (type === "running") {
      const cadence = +inputCadence.value;
      // Verificar se os dados são válidos
      if (
        !Number.isFinite(distance) ||
        !Number.isFinite(duration) ||
        !Number.isFinite(cadence)
        // Outra opção !validInputs(distance, duration, cadence)
      )
        return alert("Os números têm de ser positivos");

      workout = new Running([lat, lng], distance, duration, cadence);
    }

    // Se a atividade for Bicicleta, criar object bicicleta
    if (type === "cycling") {
      const elevationGain = +inputElevation.value;
      // Verificar se os dados são válidos
      if (
        !Number.isFinite(distance) ||
        !Number.isFinite(duration) ||
        !Number.isFinite(elevationGain)
        // Outra opção !validInputs(distance, duration, elevationGain)
      )
        return alert("Os números têm de ser positivos");

      workout = new Cycling([lat, lng], distance, duration, elevationGain);
    }

    // Adicionar novo objeto ao array
    this.#workouts.push(workout);
    console.log(workout);

    // Adiciona a atividade com o marcador, no mapa
    this._renderWorkoutMarker(workout);

    // Renderizar a atividade na lista
    this._renderWorkout(workout);

    // Mostrar o botão "Delete All" se houver workouts
    this._toggleDeleteAllButton();

    // Limpar os campos do form e esconder
    this._hideForm();

    // Definir local storage para todas as atividades
    this._setLocalStorage();
  }

  _renderWorkoutMarker(workout) {
    // Obtém as coordenadas
    const marker = L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 300,
          minWidth: 50,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === "running" ? "🏃‍♂️" : "🚴‍♀️"} ${workout.description}`
      )
      .openPopup();

    this.#markers.set(workout.id, marker);
  }

  _renderWorkout(workout) {
    let html = `
    <li class="workout workout--${workout.type}" data-id="${workout.id}">
      <div class="workout__header">
        <h2 class="workout__title">${workout.description}</h2>
        <div class="workout__delete">
          <span class="del">X</span>
        </div>
      </div>
      
      <div class="workout__details">
        <span class="workout__icon">${
          workout.type === "running" ? "🏃‍♂️" : "🚴‍♀️"
        }</span>
        <span class="workout__value">${workout.distance}</span>
        <span class="workout__unit">km</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">⏱</span>
        <span class="workout__value">${workout.duration}</span>
        <span class="workout__unit">min</span>
      </div>
    `;

    if (workout.type === "running")
      html += `
      <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.pace.toFixed(1)}</span>
            <span class="workout__unit">min/km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">🦶🏼</span>
            <span class="workout__value">${workout.cadence}</span>
            <span class="workout__unit">spm</span>
          </div>
      </li>
      `;

    if (workout.type === "cycling")
      html += `
        <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.speed.toFixed(1)}</span>
            <span class="workout__unit">km/h</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⛰</span>
            <span class="workout__value">${workout.elevationGain}</span>
            <span class="workout__unit">m</span>
          </div>
        `;

    form.insertAdjacentHTML("afterend", html);
  }

  // Método para se mover para o marker
  _moveToPopup(e) {
    const workoutEl = e.target.closest(".workout");

    //console.log(workoutEl);

    if (!workoutEl) return;

    const workout = this.#workouts.find(function (work) {
      return work.id === workoutEl.dataset.id;
    });

    //console.log(workout);

    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });
  }

  // Método para guardar no local storage
  _setLocalStorage() {
    localStorage.setItem("workouts", JSON.stringify(this.#workouts));
  }

  // Método para obter os dados do local storage
  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem("workouts"));
    console.log(data);

    if (!data) return;

    this.#workouts = data;

    this.#workouts.forEach((work) => {
      this._renderWorkout(work);
    });
  }

  // reset() {
  //   localStorage.removeItem("workouts");
  //   location.reload();
  // }

  _toggleDeleteAllButton() {
    if (this.#workouts.length > 1) {
      deleteAllBtn.classList.remove("hidden"); // Mostra o botão
    } else {
      deleteAllBtn.classList.add("hidden"); // Esconde o botão
    }
  }

  // Método para apagar todos os dados
  _deleteAll() {
    this.#workouts = [];
    localStorage.clear();

    const workouts = document.querySelectorAll(".workout");

    workouts.forEach((workout) => {
      workout.remove();
    });

    this.#map.eachLayer(function (layer) {
      if (layer instanceof L.Marker) {
        layer.remove();
      }
    });
    
    this._toggleDeleteAllButton();
  }

  // Método para apagar apenas um dado
  _deleteWorkout(e) {
    // Verifica se o clique foi no botão de delete
    const deleteBtn = e.target.closest(".workout__delete");
    if (!deleteBtn) return;
    console.log(deleteBtn);

    // Encontrar o elemento do treino
    const workoutEl = deleteBtn.closest(".workout");
    if (!workoutEl) return;
    console.log(workoutEl);

    // Obter o ID do treino a partir do dataset
    const workoutId = workoutEl.dataset.id;
    console.log(workoutId);

    // Remover o treino da lista
    this.#workouts = this.#workouts.filter(function (work) {
      return work.id !== workoutId;
    });

    // Remover o marcador do mapa
    this.#markers.get(workoutId).remove(this.#map);

    // Remover o marcador do DOM
    workoutEl.remove();

    this._toggleDeleteAllButton();

    // Atualizar o localStorage
    this._setLocalStorage();
  }
}

// Inicializa
const app = new App();
