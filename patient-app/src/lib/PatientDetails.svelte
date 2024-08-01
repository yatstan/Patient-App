                                                                                          <script lang="ts">
                                                                                            import axios from "axios";
                                                                                            import { FHIR_BASE_URL } from "../config";
                                                                                            import type { Patient } from "fhir/r4";

                                                                                            export let accessToken: string;
                                                                                            export let patientId: string;
                                                                                            let errorMessage = '';

                                                                                            const getPatientDetails = async () => {
                                                                                              try {
                                                                                                const patientResponse = await axios.get<Patient>(`${FHIR_BASE_URL}/Patient/${patientId}`, {
                                                                                                  headers: {
                                                                                                    'Authorization': `Bearer ${accessToken}`
                                                                                                  }
                                                                                                });
                                                                                                return patientResponse.data;
                                                                                              } catch (error) {
                                                                                                console.error('Error fetching patient details:', error);
                                                                                                errorMessage = 'Error fetching patient details: ' + error.message;
                                                                                                return null;
                                                                                              }
                                                                                            };
                                                                                          </script>

                                                                                          <div class="mt-10 max-w-md mx-auto bg-white rounded-lg shadow-lg p-6 border-t-4 border-blue-500">
                                                                                            {#await getPatientDetails()}
                                                                                              <div class="flex justify-center items-center">
                                                                                                <h5 class="text-lg font-semibold text-blue-500">Loading...</h5>
                                                                                              </div>
                                                                                            {:then patient}
                                                                                              {#if patient}
                                                                                                <div class="text-center mb-4">
                                                                                                  <img src="https://via.placeholder.com/100" alt="Profile" class="w-24 h-24 mx-auto rounded-full shadow-md border-2 border-blue-500">
                                                                                                  <h1 class="text-2xl font-bold mt-4 text-blue-600">{patient?.name?.[0]?.given?.[0]} {patient?.name?.[0]?.family}</h1>
                                                                                                  <p class="text-gray-600">{patient?.name?.[0]?.text}</p>
                                                                                                </div>
                                                                                                <div class="space-y-4">
                                                                                                  <p class="text-left"><span class="font-semibold text-blue-600">Full Name:</span> {patient?.name?.[0]?.text}</p>
                                                                                                  <p class="text-left"><span class="font-semibold text-blue-600">Epic identifier:</span> {patient?.identifier?.find(i => i.system === 'urn:oid:1.2.840.114350.1.13.0.1.7.5.737384.0')?.value}</p>
                                                                                                  <p class="text-left"><span class="font-semibold text-blue-600">Date of birth:</span> {patient?.birthDate}</p>
                                                                                                  <p class="text-left"><span class="font-semibold text-blue-600">Gender:</span> <span class="capitalize">{patient?.gender}</span></p>
                                                                                                </div>
                                                                                              {/if}
                                                                                            {:catch error}
                                                                                              <p class="text-red-500">Error loading patient details. Please try again later.</p>
                                                                                            {/await}
                                                                                            {#if errorMessage}
                                                                                              <p class="text-red-500">{errorMessage}</p>
                                                                                            {/if}
                                                                                          </div>
